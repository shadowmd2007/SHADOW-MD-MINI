import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  Browsers
} from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config.js';
import { createServer } from './server.js';
import handler from './handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const AUTH_DIR = process.env.AUTH_DIR || './auth';
const PORT = process.env.PORT || 3000;

let sock = null;
let qrSeen = false;
let myGen = false;

async function startBot() {
  try {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
    
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
      },
      browser: Browsers.ubuntu('Chrome'),
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if (connection === 'close') {
        let reason = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed, code:', reason);
        if (reason === DisconnectReason.loggedOut) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          console.log('Logged out, wipe session, restart pairing');
          myGen = false;
          setTimeout(startBot, 5000);
        } else {
          setTimeout(startBot, 5000);
        }
      } else if (connection === 'open') {
        console.log('Connected to WhatsApp!');
        qrSeen = false;
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      try {
        for (let m of messages) {
          if (!m.message) continue;
          await handler(sock, m);
        }
      } catch (e) {
        console.log('Handler error:', e.message);
      }
    });

  } catch (e) {
    console.log('StartBot error:', e.message);
    setTimeout(startBot, 5000);
  }
}

// Web server for pairing code
const app = createServer({ sock: () => sock, startPairing: startBot });
app.listen(PORT, () => console.log(`Web server on port ${PORT}`));

startBot();