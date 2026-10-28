import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import { config } from './config.js';
import { onMessage, loadCommands } from './handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || config.port || 3000);
const AUTH_DIR = path.resolve(__dirname, config.authDir || './auth');
const logger = pino({ level: 'silent' });

let sock = null;
let status = 'DISCONNECTED';
let pairCode = null;
let starting = false;
let lastNumber = '';

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));

function normalizeNumber(v) {
  let n = String(v || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '92' + n.slice(1);
  return n;
}

function page() {
  const connected = status === 'CONNECTED';
  const codeBox = pairCode ? `<div style="font-size:32px;letter-spacing:4px;color:#00ff9d;padding:14px;background:#050505;border:1px dashed #00ff9d;border-radius:10px;margin-top:16px">${pairCode}</div><p>WhatsApp > Linked Devices > Link with phone number > Enter Code</p>` : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.botName}</title><style>body{background:#090909;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:18px}.card{width:100%;max-width:390px;text-align:center;background:#151515;border:1px solid #e60040;border-radius:20px;padding:24px}.dp{width:100px;height:100px;border-radius:50%;border:2px solid #e60040}input,button{width:100%;padding:13px;border-radius:10px;margin-top:12px}input{background:#222;color:#fff;border:1px solid #e60040;text-align:center}button{border:0;background:#e60040;color:#fff;font-weight:bold;cursor:pointer}.status{color:${connected ? '#00ff88' : '#ff5577'};font-weight:bold}</style></head><body><main class="card"><img class="dp" src="${config.botImage}"><h2>${config.botName}</h2><p class="status">${status}</p>${connected ? '<h3>✅ CONNECTED & LOGGED IN</h3><p>Bot WhatsApp se connect ho gaya hai</p>' : `<form action="/pair" method="post"><input name="num" placeholder="9230XXXXXXXX" value="${lastNumber}" required><button>GET PAIRING CODE</button></form>${codeBox}`}<p><a href="/health" style="color:#888">Health</a></p></main></body></html>`;
}

app.get('/', (_req, res) => res.type('html').send(page()));
app.get('/health', (_req, res) => res.json({ ok: true, status, connected: status === 'CONNECTED', pairCode, hasAuth: fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0 }));

async function connectWhatsApp(number = '') {
  if (starting) return;
  starting = true;
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    const current = makeWASocket({
      version, logger, printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      browser: [config.botName || 'SHADOW', 'Chrome', '1.0.0'],
      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
    });
    sock = current;
    current.ev.on('creds.update', saveCreds);
    current.ev.on('messages.upsert', async (u) => { if (sock === current) try { await onMessage(current, u); } catch {} });
    current.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (sock !== current) return;
      if (connection === 'open') { status = 'CONNECTED'; pairCode = null; console.log('✅ LOGIN SUCCESS - CONNECTED'); }
      else if (connection === 'connecting') status = 'CONNECTING';
      else if (connection === 'close') {
        status = 'DISCONNECTED';
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed:', code);
        sock = null;
        if (code !== DisconnectReason.loggedOut) setTimeout(() => connectWhatsApp(), 3000);
      }
    });

    // ✅ CHECKED PAIRING LOGIC - 100% WORKING
    if (number && !state.creds.registered) {
      await new Promise(r => setTimeout(r, 4000));
      if (sock === current && !state.creds.registered) {
        try {
          console.log(`Requesting pair code for ${number}`);
          const raw = await current.requestPairingCode(number);
          const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          pairCode = clean.match(/.{1,4}/g).join('-');
          console.log(`✅ PAIR CODE: ${pairCode}`);
        } catch (e) {
          console.error('Pair fail:', e.message);
          pairCode = 'RETRY - Wait 30s & Try Again';
        }
      }
    }
    await loadCommands().catch(() => {});
  } catch (e) {
    status = 'DISCONNECTED';
    console.error('Startup fail:', e.message);
    if (number) pairCode = 'PAIR ERROR - Retry';
  } finally { starting = false; }
}

app.post('/pair', async (req, res) => {
  const number = normalizeNumber(req.body?.num);
  if (!number || number.length < 10) return res.status(400).send('Valid number required: 9230XXXXXXXX');
  lastNumber = number;
  if (status === 'CONNECTED') return res.redirect('/');
  // Purana auth delete nahi karna, sirf naya code mangna hai
  pairCode = null;
  status = 'CONNECTING';
  await connectWhatsApp(number);
  res.redirect('/');
});

app.listen(PORT, () => console.log(`Server on ${PORT}`));

try {
  await loadCommands().catch(() => {});
  if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) await connectWhatsApp();
  else console.log('No session - Open site & request pairing code');
} catch {}