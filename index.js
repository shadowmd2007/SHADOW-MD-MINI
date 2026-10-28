import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_DIR = './auth';
const logger = pino({ level: 'silent' });

let sock;
let status = 'DISCONNECTED';
let pairCode = null;
let pairTime = 0;
let lastNumber = '';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function cleanAuth() {
  if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

function html() {
  const valid = pairCode && Date.now() - pairTime < 60000;
  return `
  <html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
  .box{background:#111;border:2px solid red;border-radius:20px;padding:25px;width:90%;max-width:380px;text-align:center}
  input{width:100%;padding:14px;border-radius:10px;border:2px solid red;background:#000;color:#fff;font-size:18px;text-align:center;margin-top:10px;box-sizing:border-box}
  button{width:100%;padding:14px;border-radius:10px;border:0;background:red;color:#fff;font-weight:bold;margin-top:10px}
  .code{border:2px dashed #0f0;padding:15px;margin-top:15px;border-radius:15px;background:#000}
  .code h1{color:#0f0;letter-spacing:5px;margin:5px 0;font-size:32px}
  .status{padding:6px 14px;border-radius:20px;font-weight:bold;display:inline-block;margin:10px}
  .CONNECTED{background:#0f0;color:#000} .CONNECTING{background:#ff0;color:#000} .DISCONNECTED{background:red}
  </style></head><body><div class="box">
  <h2>RANA FURQAN MD</h2>
  <div class="status ${status}">${status}</div>
  ${status==='CONNECTED' ? `<h3 style="color:#0f0">✅ LOGIN SUCCESS</h3><p>Bot Connected! Ab WhatsApp pe jao.</p>` : `
  <form method="POST" action="/pair">
  <input name="num" value="${lastNumber}" placeholder="923263695287" required>
  <button>GET PAIRING CODE</button>
  </form>
  ${valid ? `<div class="code"><div>✅ CODE READY</div><h1>${pairCode}</h1><div style="font-size:12px;color:#aaa">WhatsApp > Linked Devices > Link with Phone Number<br>Paste Code<br>${lastNumber}</div><div id="t" style="color:yellow;margin-top:5px">60s</div></div><script>let s=60;setInterval(()=>{s--;document.getElementById('t').innerText=s+'s'; if(s<=0) location.reload()},1000)</script>` : ''}
  `}
  </div></body></html>`;
}

app.get('/', (req, res) => res.send(html()));

async function startBot(num) {
  if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, {recursive:true});
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  
  sock = makeWASocket({
    version, logger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: ['Chrome','Chrome','110.0.0.0'],
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if(connection === 'open') {
      status = 'CONNECTED';
      console.log('✅ SUCCESSFULLY CONNECTED');
    }
    if(connection === 'close') {
      const reason = lastDisconnect?.error?.output?.statusCode;
      status = 'DISCONNECTED';
      if(reason !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...');
        setTimeout(() => startBot(), 3000);
      }
    }
    if(connection === 'connecting') status = 'CONNECTING';
  });

  if(num) {
    await new Promise(r=>setTimeout(r,3000));
    try {
      let code = await sock.requestPairingCode(num);
      code = code.toUpperCase().match(/.{1,4}/g).join('-');
      pairCode = code;
      pairTime = Date.now();
      console.log('PAIR CODE:', pairCode);
    } catch(e) { console.log('Pair Error', e.message); }
  }
}

app.post('/pair', async (req, res) => {
  let n = (req.body.num || '').replace(/\D/g,'');
  if(n.startsWith('0')) n = '92'+n.slice(1);
  lastNumber = n;
  pairCode = null;
  cleanAuth();
  status = 'CONNECTING';
  await startBot(n);
  // Code banne ka wait
  for(let i=0;i<10;i++) { if(pairCode) break; await new Promise(r=>setTimeout(r,1000)); }
  res.redirect('/');
});

app.listen(PORT, () => console.log('Server on', PORT));
if(fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) startBot();