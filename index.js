import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(__dirname));
const publicPath = path.join(__dirname, 'public');
if (fs.existsSync(publicPath)) app.use(express.static(publicPath));

app.get('/health', (req,res)=>res.json({ok:true,status:'running'}));

let globalSock = null;
let saveCredsGlobal = null;

// --- PAIRING API FIX ---
app.get('/pair', async (req, res) => {
  const number = req.query.number || req.query.num;
  // Agar number nahi hai to site dikhao
  if (!number) {
    return res.sendFile(path.join(__dirname, 'index.html'));
  }
  // Agar number hai to pairing code do
  try {
    if (!globalSock) return res.status(503).json({ error: 'Bot starting, try again in 10 sec' });
    const cleanNum = number.replace(/[^0-9]/g, '');
    if (!globalSock.authState?.creds?.registered) {
        const code = await globalSock.requestPairingCode(cleanNum);
        console.log(`Pairing code for ${cleanNum}: ${code}`);
        return res.json({ code: code, message: 'Code generated' });
    } else {
        return res.json({ error: 'Already paired' });
    }
  } catch (e) {
    console.error('Pair error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Web running on ${PORT}`));

// --- BOT ---
(async () => {
  try {
    const pino = (await import('pino')).default;
    const baileys = await import('@whiskeysockets/baileys');
    const makeWASocket = baileys.default;
    const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, Browsers, makeCacheableSignalKeyStore } = baileys;

    let config = { ownerNumber: '923000000000', botName: 'SHADOW MD' };
    try { const cfg = await import('./config.js'); config = { ...config, ...(cfg.default || cfg) }; } catch {}

    const authDir = './auth';
    fs.mkdirSync(authDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    saveCredsGlobal = saveCreds;
    const { version } = await fetchLatestBaileysVersion();
    const logger = pino({ level: 'silent' });

    const sock = makeWASocket({
      version, logger, printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      markOnlineOnConnect: true,
    });
    globalSock = sock;

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        console.log(`✅ ${config.botName} Connected!`);
        try { const { loadCommands } = await import('./handler.js'); await loadCommands(); } catch {}
      }
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code === DisconnectReason.loggedOut) fs.rmSync(authDir, { recursive: true, force: true });
        setTimeout(() => process.exit(1), 2000);
      }
    });
    sock.ev.on('messages.upsert', async (m) => {
      try { const { onMessage } = await import('./handler.js'); await onMessage(sock, m); } catch {}
    });
  } catch (e) {
    console.error('Bot error:', e.message);
  }
})();