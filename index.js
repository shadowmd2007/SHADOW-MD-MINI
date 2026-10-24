import fs from 'fs';
import path from 'path';
import pino from 'pino';
import express from 'express';
import makeWASocket, {
  useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason,
  Browsers, makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import config from './config.js';
import store, { cache } from './lib/store.js';
import * as U from './lib/utils.js';
import { loadCommands, onMessage } from './handler.js';
import { onGroupUpdate } from './plugins/groups.js';
import { pairNumber } from './lib/pair.js';

try { const f = (await import('ffmpeg-static')).default; if (f) process.env.FFMPEG_PATH = f; } catch {}

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e?.message || e));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e?.message || e));

/* ---------------- Web server (Render ke liye) ---------------- */
const app = express();
const startedAt = Date.now();
const lastPair = new Map();
app.get('/health', (_, res) => res.json({ ok: true, bot: config.botName, uptime: U.runtime((Date.now() - startedAt) / 1000) }));
app.get('/pair', async (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.ip;
  if (Date.now() - (lastPair.get(ip) || 0) < 15000) return res.status(429).json({ error: '15 second baad dobara try karo' });
  lastPair.set(ip, Date.now());
  try { res.json({ code: await pairNumber(req.query.number) }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.use(express.static('public'));
app.get('/', (_, res) => {
  const f = path.resolve('index.html');
  fs.existsSync(f) ? res.sendFile(f) : res.send(`${config.botName} is running ✅`);
});
app.listen(config.port, () => console.log(`🌐 Server port ${config.port} par chal raha hai`));

if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => fetch(process.env.RENDER_EXTERNAL_URL + '/health').catch(() => {}), 4 * 60 * 1000);
}

/* ---------------- WhatsApp ---------------- */
const logger = pino({ level: 'silent' });
const sentIds = new Set();
let sessionWritten = false;
let presenceTimer;

async function start() {
  fs.mkdirSync(config.authDir, { recursive: true });
  const credsPath = path.join(config.authDir, 'creds.json');
  if (process.env.SESSION_ID && !sessionWritten && !fs.existsSync(credsPath)) {
    try {
      const raw = process.env.SESSION_ID.trim().split(';;;').pop();
      const txt = Buffer.from(raw, 'base64').toString('utf8');
      JSON.parse(txt);
      fs.writeFileSync(credsPath, txt);
      console.log('🔑 SESSION_ID se login ho raha hai');
    } catch { console.error('❌ SESSION_ID galat hai'); }
    sessionWritten = true;
  }

  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version, logger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    getMessage: async (key) => cache.get(key.id)?.message,
  });

  // bot ke apne bheje hue messages ko dobara process na karein
  const origSend = sock.sendMessage.bind(sock);
  sock.sendMessage = async (...a) => {
    const r = await origSend(...a);
    if (r?.key?.id) { sentIds.add(r.key.id); if (sentIds.size > 2000) sentIds.delete(sentIds.values().next().value); }
    return r;
  };

  sock.ev.on('creds.update', saveCreds);

  if (!sock.authState.creds.registered) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.botNumber);
        console.log(`\n==============================\n  PAIRING CODE: ${code.match(/.{1,4}/g).join('-')}\n  WhatsApp > Linked Devices > Link with phone number\n==============================\n`);
      } catch (e) { console.error('Pairing code error:', e.message); }
    }, 3000);
  }

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`✅ ${config.botName} connected as ${sock.user.id}`);
      clearInterval(presenceTimer);
      const setP = () => sock.sendPresenceUpdate(store.get('online') ? 'available' : 'unavailable').catch(() => {});
      setP(); presenceTimer = setInterval(setP, 60000);
      sock.sendMessage(U.ownerJid(), { text: `✅ *${store.get('botName')}* online hai!\n🔧 Prefix: ${store.get('prefix')}\n📦 Commands: ${(await import('./handler.js')).commandList.length}` }).catch(() => {});
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      clearInterval(presenceTimer);
      if (code === DisconnectReason.loggedOut) {
        console.log('🚪 Logged out. Auth delete kar ke dobara pairing code bana raha hoon...');
        fs.rmSync(config.authDir, { recursive: true, force: true });
      } else console.log('🔄 Reconnecting... (code', code, ')');
      setTimeout(() => start().catch((e) => console.error(e)), 3000);
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const m of messages) {
      if (m.key?.id && sentIds.has(m.key.id)) continue;
      onMessage(sock, m).catch((e) => console.error('onMessage:', e?.message || e));
    }
  });

  sock.ev.on('group-participants.update', (u) => onGroupUpdate(sock, u));
}

await loadCommands();
start().catch((e) => console.error('start error:', e));
