import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// FIX: Cannot GET / Error Fix
const publicPath = path.join(__dirname, 'public');
if (!fs.existsSync(publicPath)) fs.mkdirSync(publicPath, { recursive: true });
app.use(express.static(publicPath));

app.get('/', (req, res) => {
  const indexFile = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else res.send(`<h1>SHADOW MD is Running ✅</h1><p>Bot is starting... Check /health</p><a href="/pair">Pairing Page</a>`);
});

app.get('/pair', (req, res) => {
  const indexFile = path.join(publicPath, 'index.html');
  if (fs.existsSync(indexFile)) res.sendFile(indexFile);
  else res.send(`<h1>Pairing Page</h1><p>public/index.html missing</p>`);
});

app.get('/health', (req, res) => res.json({ ok: true, status: 'running', time: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Web running on port ${PORT}`));

// --- BOT LOGIC ALAG SE START HOGA TAKE WEB CRASH NA HO ---
(async () => {
  try {
    console.log('🔄 Starting Bot Logic...');
    const pino = (await import('pino')).default;
    const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, Browsers, makeCacheableSignalKeyStore } = await import('@whiskeysockets/baileys');
    
    let config = { ownerNumber: '923xxx', botName: 'SHADOW MD', authDir: './auth', port: PORT };
    try {
      const cfg = await import('./config.js');
      config = { ...config, ...(cfg.default || {}) };
    } catch {}

    const authDir = './auth';
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version, logger,
      printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      markOnlineOnConnect: true,
    });

    if (!state.creds.registered) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const number = (config.ownerNumber || '923000000000').replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(number);
        console.log(`\n\n======== PAIRING CODE: ${code} ========\n\n`);
      } catch (e) { console.log('Pairing fail:', e.message); }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(`✅ ${config.botName} Connected!`);
        try {
          const { loadCommands } = await import('./handler.js');
          await loadCommands();
        } catch (e) { console.log('Commands load fail:', e.message); }
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('Closed, code:', code);
        if (code === DisconnectReason.loggedOut) {
          fs.rmSync(authDir, { recursive: true, force: true });
        }
        setTimeout(() => process.exit(1), 2000); // Render khud restart karega
      }
    });

    sock.ev.on('messages.upsert', async (m) => {
      try {
        const { onMessage } = await import('./handler.js');
        await onMessage(sock, m);
      } catch (e) { console.error('onMessage:', e.message); }
    });

  } catch (e) {
    console.error('Bot logic error (Web will still run):', e.message);
    console.error(e.stack);
  }
})();