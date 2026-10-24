// SHADOW MD MINI - index.js
// Web server (Render/Railway) + /api/commands + WhatsApp pairing + the bot itself.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pino from 'pino';
import config from './config.js';
import { loadCommands, listCommands, loadErrors, commands } from './plugins/index.js';
import { rememberMessage, getStoredMessage, handleRevoke } from './lib/store.js';
import handleMessage from './handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(config.authDir);
const PORT = process.env.PORT || config.port;
const logger = pino({ level: 'silent' });
// Loads Baileys in a way that works for both the CommonJS (6.x) and ESM (7.x) builds.
let baileysCache;
async function loadBaileys() {
  if (baileysCache) return baileysCache;
  const ns = await import('@whiskeysockets/baileys');
  const d = ns.default;
  const pick = (k) => ns[k] ?? d?.[k];
  baileysCache = {
    makeWASocket: typeof d === 'function' ? d : (d?.default ?? ns.makeWASocket),
    useMultiFileAuthState: pick('useMultiFileAuthState'),
    makeCacheableSignalKeyStore: pick('makeCacheableSignalKeyStore'),
    fetchLatestBaileysVersion: pick('fetchLatestBaileysVersion'),
    Browsers: pick('Browsers'),
    DisconnectReason: pick('DisconnectReason'),
  };
  if (typeof baileysCache.makeWASocket !== 'function') throw new Error('Baileys makeWASocket not found - run npm install');
  return baileysCache;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

process.on('unhandledRejection', (e) => console.log('unhandledRejection:', e?.message || e));
process.on('uncaughtException', (e) => console.log('uncaughtException:', e?.message || e));

console.log('Starting bot...');
console.log('Node.js', process.version);

// ------------------------------------------------------------------ web server
const app = express();
app.use(express.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.send('OK'));

// Every command, for the website (index.html)
app.get('/api/commands', (req, res) => {
  const list = listCommands(config.prefix);
  res.json({
    bot: config.botName,
    prefix: config.prefix,
    total: list.length,
    categories: [...new Set(list.map((c) => c.category))],
    commands: list,
    errors: loadErrors,
  });
});

app.get('/api/status', (req, res) => {
  res.json({ ...status, bot: config.botName, owner: config.ownerName, mode: config.mode, prefix: config.prefix, commands: commands.size });
});

const lastPair = new Map();
async function pairHandler(req, res) {
  const number = String(req.query.number || req.body?.number || '').replace(/\D/g, '');
  if (number.length < 10) return res.status(400).json({ error: 'Number galat hai. Country code ke saath likho, e.g. 923001234567' });
  const last = lastPair.get(number) || 0;
  if (Date.now() - last < 10000) return res.status(429).json({ error: 'Thora ruko, 10 second baad dobara try karo' });
  lastPair.set(number, Date.now());
  try {
    const code = await requestPairingCode(number);
    res.json({ code });
  } catch (e) {
    console.log('Pair error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}
app.get('/api/pair', pairHandler);
app.post('/api/pair', pairHandler);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// listen first, so Render/Railway see the port immediately
app.listen(PORT, () => console.log(`Server running on ${PORT}`));

// ------------------------------------------------------------------ WhatsApp
const status = { connection: 'close', registered: false, user: null, note: 'starting' };
let sock = null;
let starting = false;
let retry = 0;
let qrSeen = false;

// Optional: restore a saved session. Put the base64 of creds.json in SESSION_ID (with or without "SHADOW~").
function restoreSession() {
  const creds = path.join(AUTH_DIR, 'creds.json');
  if (!process.env.SESSION_ID || fs.existsSync(creds)) return;
  try {
    const data = Buffer.from(process.env.SESSION_ID.replace(/^SHADOW~/, ''), 'base64').toString();
    JSON.parse(data);
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(creds, data);
    console.log('Session restored from SESSION_ID');
  } catch (e) {
    console.log('SESSION_ID invalid:', e.message);
  }
}

function dropSocket() {
  const old = sock;
  sock = null;
  if (!old) return;
  try { old.ev.removeAllListeners(); } catch { /* ignore */ }
  try { old.end(undefined); } catch { /* ignore */ }
}

async function startBot() {
  if (starting) return;
  starting = true;
  try {
    dropSocket(); // never keep two sockets on the same session - that is what causes "Waiting for this message"
    const B = await loadBaileys();
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    restoreSession();
    const { state, saveCreds } = await B.useMultiFileAuthState(AUTH_DIR);
    const { version } = await B.fetchLatestBaileysVersion().catch(() => ({}));
    status.registered = !!state.creds.registered;
    qrSeen = false;

    const s = B.makeWASocket({
      version,
      logger,
      auth: { creds: state.creds, keys: B.makeCacheableSignalKeyStore(state.keys, logger) },
      browser: B.Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      // THE FIX for "Waiting for this message": when WhatsApp asks the bot to resend a message it could not decrypt,
      // Baileys needs getMessage() to return the original message.
      getMessage: async (key) => getStoredMessage(key)?.message,
    });
    sock = s;

    s.ev.on('creds.update', saveCreds);

    s.ev.on('connection.update', async (u) => {
      if (s !== sock) return;
      const { connection, lastDisconnect, qr } = u;
      if (qr) qrSeen = true;
      if (connection) status.connection = connection;

      if (connection === 'open') {
        retry = 0;
        status.registered = true;
        status.user = s.user?.id || null;
        status.note = 'connected';
        console.log('SHADOW-MD connected as', status.user, '| commands:', commands.size);
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed, code:', code, lastDisconnect?.error?.message || '');
        status.user = null;
        if (code === B.DisconnectReason.loggedOut) {
          status.note = 'logged out - pair again';
          status.registered = false;
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          await sleep(1000);
          return startBot();
        }
        if (code === B.DisconnectReason.connectionReplaced) {
          status.note = 'replaced by another instance of this bot (same session running twice)';
          console.log('Session is open somewhere else - not reconnecting. Stop the other instance and restart.');
          return;
        }
        status.note = 'reconnecting';
        const wait = code === B.DisconnectReason.restartRequired ? 500 : Math.min(30000, 2000 * 2 ** retry++);
        await sleep(wait);
        starting = false;
        return startBot();
      }
    });

    s.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const m of messages) {
        try {
          rememberMessage(m);
          if (await handleRevoke(s, m)) continue;
          if (type !== 'notify') continue;
          let t = m.messageTimestamp;
          t = typeof t === 'object' && t ? (t.toNumber?.() ?? t.low) : Number(t);
          if (t && Date.now() / 1000 - t > 120) continue; // ignore old messages replayed after a reconnect
          if (m.key.fromMe && String(m.key.id).startsWith('BAE5')) continue; // the bot's own replies
          await handleMessage(s, m);
        } catch (e) {
          console.log('message error:', e?.message || e);
        }
      }
    });
  } catch (e) {
    console.log('startBot failed:', e.message);
    status.note = 'start failed: ' + e.message;
    setTimeout(startBot, 10000);
  } finally {
    starting = false;
  }
}

async function requestPairingCode(number) {
  if (status.registered && status.connection === 'open') {
    const err = new Error('Bot pehle se linked hai. Dobara pair karne ke liye WhatsApp > Linked devices se purani link hata do aur auth folder delete karo.');
    err.status = 409;
    throw err;
  }
  if (!sock) await startBot();
  // wait until WhatsApp is ready to accept a pairing request
  for (let i = 0; i < 40 && !qrSeen && status.connection !== 'open'; i++) await sleep(500);
  if (!sock) throw new Error('Bot start nahi hua, thori der baad try karo');
  if (sock.authState?.creds?.registered) {
    const err = new Error('Bot pehle se linked hai.');
    err.status = 409;
    throw err;
  }
  const raw = await sock.requestPairingCode(number);
  return raw?.match(/.{1,4}/g)?.join('-') || raw;
}

try {
  await loadCommands();
} catch (e) {
  console.log('Command load error:', e.message);
}
startBot();

// keeps the Render log alive
setInterval(() => console.log('Keep alive -', new Date().toISOString(), '| WA:', status.connection), 60000).unref?.();
