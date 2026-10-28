import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
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
let pairCodeTime = null;
let starting = false;
let lastNumber = '';
let lastPairRequest = 0;

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));

function normalizeNumber(v) {
  let n = String(v || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '92' + n.slice(1);
  return n;
}

// DHAMAKA THEME - 1 MIN VALID + DP SAME
function page() {
  const connected = status === 'CONNECTED';
  const hasCode = pairCode && pairCodeTime && (Date.now() - pairCodeTime < 60000);
  const codeBox = hasCode ? `
    <div class="code-box">
      <div class="code-title">⚡ YOUR PAIRING CODE - 1 MIN VALID ⚡</div>
      <div class="code">${pairCode}</div>
      <div class="timer" id="timer">Valid: 60s</div>
      <div class="steps">
        1. WhatsApp Open Karo<br>
        2. Linked Devices > Link a Device<br>
        3. Link with phone number > Code Paste Karo
      </div>
    </div>
    <script>
      let sec=60;
      let timer=setInterval(()=>{
        sec--;
        document.getElementById('timer').innerText='Valid: '+sec+'s';
        if(sec<=0){ clearInterval(timer); location.reload(); }
      },1000);
    </script>
  ` : (pairCode ? `<div class="code-box expired">${pairCode} - EXPIRED, Again Press Button</div>` : '');

  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.botName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap');
  body{margin:0;min-height:100vh;background:radial-gradient(circle at 30% 20%, #ff0055 0%, #0a0a0a 60%);display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px}
  .card{width:100%;max-width:400px;background:rgba(0,0,0,0.85);border:2px solid #ff0055;border-radius:25px;padding:25px;text-align:center;box-shadow:0 0 40px #ff0055, inset 0 0 20px rgba(255,0,85,0.2);animation:glow 2s infinite alternate}
  @keyframes glow{0%{box-shadow:0 0 30px #ff0055}100%{box-shadow:0 0 60px #ff0055, 0 0 100px #ff0055}}
  .dp{width:110px;height:110px;border-radius:50%;border:3px solid #ff0055;box-shadow:0 0 25px #ff0055;object-fit:cover}
  h2{font-family:'Orbitron';letter-spacing:2px;margin:15px 0 5px;color:#fff;text-shadow:0 0 10px #ff0055}
  .status{font-weight:bold;padding:8px 15px;border-radius:20px;display:inline-block;margin:10px 0;font-size:14px}
  .status.CONNECTED{background:#00ff88;color:#000;box-shadow:0 0 20px #00ff88}
  .status.DISCONNECTED{background:#ff0055;color:#fff;box-shadow:0 0 20px #ff0055}
  .status.CONNECTING{background:#ffaa00;color:#000}
  input{width:100%;padding:14px;border-radius:12px;margin-top:12px;background:#1a1a1a;color:#fff;border:2px solid #ff0055;text-align:center;font-size:18px;outline:none}
  input:focus{border-color:#00ff88;box-shadow:0 0 15px #00ff88}
  button{width:100%;padding:14px;border-radius:12px;margin-top:12px;border:0;background:linear-gradient(90deg,#ff0055,#ff5500);color:#fff;font-weight:bold;cursor:pointer;font-size:16px;letter-spacing:1px;box-shadow:0 0 20px #ff0055;transition:0.3s}
  button:hover{transform:scale(1.03);box-shadow:0 0 40px #ff0055}
  button:disabled{background:#555;box-shadow:none;cursor:not-allowed}
  .code-box{margin-top:20px;background:#000;border:2px dashed #00ff9d;border-radius:15px;padding:15px;animation:pop 0.5s}
  @keyframes pop{0%{transform:scale(0.8)}100%{transform:scale(1)}}
  .code-title{font-size:12px;color:#ffaa00;font-weight:bold;letter-spacing:1px}
  .code{font-size:34px;letter-spacing:5px;color:#00ff9d;font-family:'Orbitron';margin:10px 0;text-shadow:0 0 15px #00ff9d}
  .timer{color:#ffaa00;font-weight:bold;font-size:14px}
  .steps{margin-top:10px;text-align:left;background:#111;padding:10px;border-radius:10px;font-size:12px;line-height:1.6;color:#aaa}
  .expired{background:#330000;border-color:#ff0055;color:#ff5577}
  .footer{margin-top:20px;font-size:11px;color:#666}
</style></head>
<body>
<main class="card">
  <img class="dp" src="${config.botImage}">
  <h2>${config.botName}</h2>
  <div class="status ${status}">${status === 'CONNECTED' ? '● CONNECTED & ONLINE' : status === 'CONNECTING' ? '● CONNECTING...' : '● DISCONNECTED'}</div>
  ${connected ? `
    <div style="margin-top:20px;padding:15px;background:#00ff8811;border:1px solid #00ff88;border-radius:12px">
      <h3 style="color:#00ff88;margin:0">✅ LOGIN SUCCESSFUL</h3>
      <p style="font-size:13px;color:#aaa;margin-top:8px">Bot is online. Type .menu in WhatsApp</p>
      <p style="font-size:12px;color:#00ff88">${autoCommandsCount()} Commands Loaded - All Working</p>
    </div>
  ` : `
    <form action="/pair" method="post">
      <input name="num" placeholder="92300XXXXXXX" value="${lastNumber}" required>
      <button ${Date.now() - lastPairRequest < 30000 ? 'disabled' : ''}>${Date.now() - lastPairRequest < 30000 ? 'WAIT 30s...' : '🔥 GET PAIRING CODE (1 MIN VALID)'}</button>
    </form>
    ${codeBox}
  `}
  <div class="footer">RANA FURQAN MD - Dhamaka Edition 🔥<br>DP Same | No Block System</div>
</main>
</body></html>`;
}

function autoCommandsCount(){
  try{
    const files = fs.readdirSync(path.join(__dirname,'./commands')).filter(f=>f.endsWith('.js'));
    return files.length;
  }catch{ return 0; }
}

app.get('/', (_req, res) => res.type('html').send(page()));
app.get('/health', (_req, res) => res.json({ ok: true, status, connected: status === 'CONNECTED', pairCode, valid: pairCodeTime ? Date.now() - pairCodeTime < 60000 : false }));

async function connectWhatsApp(number = '') {
  if (starting) return;
  // ANTI-BLOCK: 30 sec cooldown
  if (Date.now() - lastPairRequest < 30000 && number) {
    pairCode = 'WAIT 30 SEC - Anti Block System';
    return;
  }
  starting = true;
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    const current = makeWASocket({
      version, logger, printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      browser: [config.botName || 'RANA FURQAN MD', 'Chrome', '1.0.0'],
      markOnlineOnConnect: true, syncFullHistory: false, connectTimeoutMs: 60000, defaultQueryTimeoutMs: 0,
    });
    sock = current;
    current.ev.on('creds.update', saveCreds);
    current.ev.on('messages.upsert', async (u) => { if (sock === current) try { await onMessage(current, u); } catch {} });
    current.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (sock !== current) return;
      if (connection === 'open') { status = 'CONNECTED'; pairCode = null; pairCodeTime = null; }
      else if (connection === 'connecting') status = 'CONNECTING';
      else if (connection === 'close') {
        status = 'DISCONNECTED';
        const code = lastDisconnect?.error?.output?.statusCode;
        sock = null;
        if (code !== DisconnectReason.loggedOut) setTimeout(() => connectWhatsApp(), 4000);
      }
    });
    if (number && !state.creds.registered) {
      await new Promise(r => setTimeout(r, 3500));
      if (sock === current && !state.creds.registered) {
        try {
          lastPairRequest = Date.now();
          const raw = await current.requestPairingCode(number);
          const clean = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase();
          pairCode = clean.match(/.{1,4}/g).join('-');
          pairCodeTime = Date.now();
          console.log(`✅ PAIR CODE GENERATED: ${pairCode} - 1 MIN VALID`);
        } catch (e) {
          const msg = e?.message || '';
          if (msg.toLowerCase().includes('rate') || msg.includes('429')) {
            pairCode = 'WHATSAPP BLOCK 5 MIN - WAIT';
            pairCodeTime = Date.now();
          } else {
            pairCode = 'TRY AGAIN AFTER 1 MIN';
            pairCodeTime = Date.now();
          }
          console.log('Pair error:', msg);
        }
      }
    }
    await loadCommands().catch(() => {});
  } catch (e) {
    status = 'DISCONNECTED';
    console.log('Connect error:', e.message);
  } finally { starting = false; }
}

app.post('/pair', async (req, res) => {
  const number = normalizeNumber(req.body?.num);
  if (!number || number.length < 10) return res.status(400).send('Valid number required');
  lastNumber = number;
  if (status === 'CONNECTED') return res.redirect('/');
  // ANTI-SPAM: Ek hi baar code
  if (Date.now() - lastPairRequest < 30000) {
    return res.redirect('/');
  }
  pairCode = null; pairCodeTime = null; status = 'CONNECTING';
  await connectWhatsApp(number);
  res.redirect('/');
});

app.listen(PORT, () => console.log(`🔥 DHAMAKA THEME ON ${PORT} - ${autoCommandsCount()} COMMANDS`));

try {
  await loadCommands().catch(() => {});
  if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) await connectWhatsApp();
} catch {}