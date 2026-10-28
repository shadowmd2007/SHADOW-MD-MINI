import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import baileysPkg from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } = baileysPkg;
import { config } from './config.js';
import { onMessage, loadCommands } from './handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_DIR = path.resolve(__dirname, config.authDir || './auth');
const logger = pino({ level: 'silent' });

let sock = null;
let status = 'DISCONNECTED';
let pairCode = null;
let pairCodeTime = null;
let starting = false;
let lastNumber = '';
let lastPairTime = 0;

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));

function normalizeNumber(v) {
  let n = String(v || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '92' + n.slice(1);
  return n;
}

function getCommandsCount() {
  try { return fs.readdirSync(path.join(__dirname, './commands')).filter(f => f.endsWith('.js') && f !== 'features.js').length; } catch { return 4; }
}

function page() {
  const connected = status === 'CONNECTED';
  const isCodeValid = pairCode && pairCodeTime && (Date.now() - pairCodeTime < 60000);
  const count = getCommandsCount();

  const codeHtml = isCodeValid ? `
    <div class="codebox">
      <div class="ctitle">🔥 PAIRING CODE - 1 MIN VALID 🔥</div>
      <div class="code">${pairCode}</div>
      <div class="timer" id="tmr">60s remaining</div>
      <div class="steps">
        <b>WhatsApp Me Code Kaise Lagana Hai:</b><br>
        1. WhatsApp Open Karo<br>
        2. Settings > Linked Devices<br>
        3. Link a Device > Link with Phone Number<br>
        4. Ye Code Paste Karo: <b>${pairCode}</b>
      </div>
    </div>
    <script>
      let s=60; let t=setInterval(()=>{s--; let e=document.getElementById('tmr'); if(e) e.innerText=s+'s remaining'; if(s<=0){clearInterval(t); location.reload();}},1000);
    </script>
  ` : (pairCode ? `<div class="codebox exp">⏰ Code Expired - Dobara Button Dabao</div>` : '');

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.botName}</title>
  <style>
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@800&display=swap');
  body{margin:0;min-height:100vh;background:linear-gradient(135deg,#000000 0%,#1a0022 50%,#ff0040 100%);display:flex;justify-content:center;align-items:center;padding:15px;font-family:Arial;color:#fff}
  .card{width:100%;max-width:410px;background:rgba(10,10,10,0.95);border:2px solid #ff0040;border-radius:28px;padding:26px;text-align:center;box-shadow:0 0 30px #ff0040,0 0 60px rgba(255,0,64,0.4)}
  .dp{width:120px;height:120px;border-radius:50%;border:3px solid #ff0040;box-shadow:0 0 30px #ff0040;object-fit:cover}
  h2{font-family:'Orbitron';font-size:28px;letter-spacing:3px;margin:14px 0 6px;text-shadow:0 0 15px #ff0040}
  .status{padding:9px 18px;border-radius:25px;font-weight:bold;display:inline-block;margin:10px 0;font-size:13px;letter-spacing:1px}
  .CONNECTED{background:#00ff88;color:#000;box-shadow:0 0 20px #00ff88}
  .DISCONNECTED{background:#ff0040;color:#fff;box-shadow:0 0 20px #ff0040}
  .CONNECTING{background:#ffaa00;color:#000;box-shadow:0 0 20px #ffaa00}
  input{width:100%;padding:15px;border-radius:14px;margin-top:14px;background:#111;color:#fff;border:2px solid #ff0040;text-align:center;font-size:19px;outline:none;box-sizing:border-box}
  input:focus{border-color:#00ff88;box-shadow:0 0 20px #00ff88}
  button{width:100%;padding:15px;border-radius:14px;margin-top:14px;border:0;background:linear-gradient(90deg,#ff0040,#ff6600);color:#fff;font-weight:800;cursor:pointer;font-size:15px;letter-spacing:1px;box-shadow:0 0 25px #ff0040;transition:0.2s}
  button:active{transform:scale(0.97)}
  button:disabled{background:#444;box-shadow:none}
  .codebox{margin-top:20px;background:#000;border:2px dashed #00ff88;border-radius:16px;padding:16px}
  .ctitle{color:#ffaa00;font-size:11px;font-weight:bold;letter-spacing:1px}
  .code{font-family:'Orbitron';font-size:36px;letter-spacing:6px;color:#00ff88;margin:12px 0;text-shadow:0 0 20px #00ff88}
  .timer{color:#ffaa00;font-weight:bold}
  .steps{margin-top:12px;text-align:left;background:#111;padding:12px;border-radius:10px;font-size:12px;line-height:1.7;color:#bbb}
  .exp{background:#300;border-color:#ff0040;color:#ff5577;padding:12px;border-radius:12px;margin-top:15px;border:1px solid}
  .success{margin-top:18px;background:rgba(0,255,136,0.1);border:1px solid #00ff88;border-radius:14px;padding:14px}
  .footer{margin-top:18px;font-size:11px;color:#777}
  </style></head><body><main class="card">
  <img class="dp" src="${config.botImage}">
  <h2>${config.botName}</h2>
  <div class="status ${status}">${status === 'CONNECTED' ? '● CONNECTED & ONLINE' : status === 'CONNECTING' ? '● CONNECTING...' : '● DISCONNECTED'}</div>
  ${connected ? `
    <div class="success"><h3 style="color:#00ff88;margin:0">✅ LOGIN SUCCESSFUL</h3>
    <p style="font-size:13px;color:#aaa;margin:8px 0 0">Bot is Connected! WhatsApp pe .menu likho</p>
    <p style="font-size:12px;color:#00ff88;margin-top:6px">${count} Commands Loaded - All Working 🔥</p></div>
  ` : `
    <form action="/pair" method="post">
      <input name="num" placeholder="92300XXXXXXX" value="${lastNumber}" required>
      <button type="submit">🔥 GET PAIRING CODE (1 MIN VALID)</button>
    </form>
    ${codeHtml}
  `}
  <div class="footer">RANA FURQAN MD - Dhamaka Edition 🔥<br>DP Same • No Block • Auto Commands • 1 Min Code</div>
  </main></body></html>`;
}

app.get('/', (_req, res) => res.type('html').send(page()));
app.get('/health', (_req, res) => res.json({ ok: true, status, pairCode, valid: pairCodeTime ? Date.now() - pairCodeTime < 60000 : false }));

async function connectWhatsApp(number = '') {
  if (starting) return;
  starting = true;
  try {
    if (number && fs.existsSync(AUTH_DIR)) {
      try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
    }
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const current = makeWASocket({
      version, logger, printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      browser: ['RANA FURQAN MD', 'Chrome', '1.0.0'],
      markOnlineOnConnect: true, syncFullHistory: false,
      connectTimeoutMs: 60000, defaultQueryTimeoutMs: 0,
    });
    sock = current;
    current.ev.on('creds.update', saveCreds);
    current.ev.on('messages.upsert', async (u) => { if (sock === current) try { await onMessage(current, u); } catch {} });
    current.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (sock !== current) return;
      if (connection === 'open') { status = 'CONNECTED'; pairCode = null; pairCodeTime = null; console.log('✅ CONNECTED'); }
      else if (connection === 'connecting') status = 'CONNECTING';
      else if (connection === 'close') {
        status = 'DISCONNECTED';
        const code = lastDisconnect?.error?.output?.statusCode;
        sock = null;
        if (code !== DisconnectReason.loggedOut) setTimeout(() => connectWhatsApp(), 3000);
      }
    });

    if (number) {
      await new Promise(r => setTimeout(r, 4000));
      if (sock === current) {
        try {
          lastPairTime = Date.now();
          const raw = await current.requestPairingCode(number);
          pairCode = raw.replace(/[^A-Z0-9]/gi, '').toUpperCase().match(/.{1,4}/g).join('-');
          pairCodeTime = Date.now();
          console.log('✅ CODE GENERATED:', pairCode);
        } catch (e) {
          console.log('Pair error:', e.message);
          pairCode = 'TRY AGAIN';
          pairCodeTime = Date.now();
        }
      }
    }
    await loadCommands().catch(() => {});
  } catch (e) {
    status = 'DISCONNECTED';
    console.log('Connect error', e.message);
  } finally { starting = false; }
}

app.post('/pair', async (req, res) => {
  const num = normalizeNumber(req.body?.num);
  if (!num || num.length < 10) return res.status(400).send('Valid number required');
  if (Date.now() - lastPairTime < 20000) return res.redirect('/');
  lastNumber = num;
  lastPairTime = Date.now();
  pairCode = null; pairCodeTime = null; status = 'CONNECTING';
  await connectWhatsApp(num);
  res.redirect('/');
});

app.listen(PORT, () => console.log(`🔥 DHAMAKA ON ${PORT} - ${getCommandsCount()} CMDS - FIXED makeWASocket`));
try {
  await loadCommands().catch(() => {});
  if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) await connectWhatsApp();
} catch {}