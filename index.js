import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';
import config from './config.js';
import store from './lib/store.js';
import * as U from './lib/utils.js';
import { loadCommands, onMessage, onGroupUpdate } from './handler.js';

try { const f = (await import('ffmpeg-static')).default; if (f) process.env.FFMPEG_PATH = f; } catch {}

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e?.message));
process.on('uncaughtException', (e) => console.error('uncaughtException:', e?.message));

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static('public'));

const sentIds = new Set();
let presenceTimer;

async function start() {
  fs.mkdirSync(config.authDir, { recursive: true });
  const credsPath = path.join(config.authDir, 'creds.json');
  
  console.log('🔄 Starting SHADOW MD...');
  
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    markOnlineOnConnect: false,
    syncFullHistory: false,
    getMessage: async (key) => {
      const msg = store.cache?.get(key.id);
      return msg?.message;
    }
  });

  // Anti-delete ke liye message save
  const origSend = sock.sendMessage.bind(sock);
  sock.sendMessage = async (...a) => {
    const r = await origSend(...a);
    if (r?.key?.id) sentIds.add(r.key.id);
    if (sentIds.size > 2000) {
      const it = sentIds.values(); sentIds.delete(it.next().value);
    }
    return r;
  };

  // Pairing Code Logic - Bina SESSION ID ke
  if (!state.creds.registered) {
    try {
      await new Promise(r => setTimeout(r, 2000));
      const number = config.ownerNumber.replace(/[^0-9]/g, '');
      const code = await sock.requestPairingCode(number);
      console.log(`\n\n================ PAIRING CODE: ${code.match(/.{1,4}/g).join('-')} ================`);
      console.log(`WhatsApp > Linked Devices > Link with phone number\n\n`);
    } catch (e) {
      console.log('Pairing error:', e.message);
    }
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log(`✅ ${config.botName} Connected! - ${new Date().toLocaleString()}`);
      await loadCommands();
      clearInterval(presenceTimer);
      presenceTimer = setInterval(() => {
        sock.sendPresenceUpdate(store.get('online') ? 'available' : 'unavailable').catch(()=>{});
      }, 30 * 1000);
      await sock.sendPresenceUpdate(store.get('online') ? 'available' : 'unavailable');
    }

    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log('Connection closed:', code);
      clearInterval(presenceTimer);
      
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Logged out, deleting session and re-pairing...');
        fs.rmSync(config.authDir, { recursive: true, force: true });
        setTimeout(() => start().catch(e => console.error(e)), 3000);
      } else {
        console.log('🔄 Reconnecting in 3 sec...');
        setTimeout(() => start().catch(e => console.error(e)), 3000);
      }
    }
  });

  sock.ev.on('messages.upsert', async (m) => {
    for (const msg of m.messages) {
      if (msg.key?.id && sentIds.has(msg.key.id)) continue;
      if (m.type === 'notify') await onMessage(sock, { messages: [msg] }).catch(e => console.error(e.message));
    }
  });

  sock.ev.on('group-participants.update', (u) => onGroupUpdate(sock, u));
}

app.get('/health', (req, res) => res.json({ ok: true, bot: config.botName }));
app.get('/pair', async (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = config.port || 3000;
app.listen(PORT, () => console.log(`Web running on port ${PORT}`));

await loadCommands();
start().catch(e => console.error('start error:', e));