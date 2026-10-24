import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// --- WEB FIX: Root wala index.html serve karega ---
const publicPath = path.join(__dirname, 'public');
app.use(express.static(__dirname)); // root folder (aapka index.html yahan hai)
if (fs.existsSync(publicPath)) app.use(express.static(publicPath));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});
app.get('/health', (req, res) => {
  res.json({ ok: true, bot: 'SHADOW MD', status: 'running', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Web running on port ${PORT} - Serving ${path.join(__dirname, 'index.html')}`));

// --- BOT LOGIC ---
(async () => {
  try {
    console.log('🔄 Starting Bot...');
    const pino = (await import('pino')).default;
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default;
    const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, Browsers, makeCacheableSignalKeyStore } = baileys;

    let config = { ownerNumber: '923000000000', botName: 'SHADOW MD', authDir: './auth' };
    try {
      const cfg = await import('./config.js');
      config = { ...config, ...(cfg.default || cfg) };
    } catch {}

    const authDir = './auth';
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
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
      markOnlineOnConnect: true,
      syncFullHistory: false,
    });

    if (!state.creds.registered) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const number = (config.ownerNumber || '').replace(/[^0-9]/g, '');
        if (number) {
          const code = await sock.requestPairingCode(number);
          console.log(`\n\n======== PAIRING CODE: ${code} ========\n`);
          console.log(`WhatsApp > Linked Devices > Link with phone number\n\n`);
        }
      } catch (e) {
        console.log('Pairing error:', e.message);
      }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(`✅ ${config.botName} Connected!`);
        try {
          const { loadCommands } = await import('./handler.js');
          await loadCommands();
        } catch (e) {
          console.log('loadCommands error:', e.message);
        }
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed:', code);
        if (code === DisconnectReason.loggedOut) {
          fs.rmSync(authDir, { recursive: true, force: true });
          console.log('Session deleted, restarting for new pairing...');
        }
        setTimeout(() => process.exit(1), 2000);
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      try {
        const { onMessage } = await import('./handler.js');
        await onMessage(sock, m);
      } catch (e) {
        console.error('onMessage error:', e.message);
      }
    });

    try {
      const { onGroupUpdate } = await import('./handler.js');
      sock.ev.on('group-participants.update', (u) => onGroupUpdate(sock, u));
    } catch {}

  } catch (e) {
    console.error('Bot logic crash (Web still running):', e.message);
    console.error(e.stack);
  }
})();