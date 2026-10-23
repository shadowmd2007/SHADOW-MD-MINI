// SHADOW-MD MINI - FIXED PAIR BUTTON - RANA FURQAN
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { createRequire } from 'module';
import { handleMessage } from './handler.js';
import { config } from './config.js';

const require = createRequire(import.meta.url);
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore } = baileys;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

let sock;
let directPic = config.imageUrl || "https://i.ibb.co/j9hXMSJH/IMG-20250513-WA0000.jpg";

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.botName}</title>
<style>
body{background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.box{background:#1c1c1e;max-width:430px;width:90%;padding:30px;border-radius:20px;text-align:center;border:1px solid #333}
.logo{width:130px;height:130px;border-radius:50%;border:3px solid #25D366;object-fit:cover}
input{width:100%;padding:14px;margin:15px 0;border-radius:10px;border:none;text-align:center;font-size:18px;box-sizing:border-box}
button{width:100%;padding:14px;background:#25D366;border:none;border-radius:10px;color:#fff;font-weight:bold;font-size:16px;cursor:pointer;user-select:none;-webkit-user-select:none;touch-action:manipulation}
button:active{transform:scale(0.97);background:#1da851}
#code{margin-top:20px;font-size:32px;color:#25D366;font-weight:bold;word-break:break-all}
#msg{font-size:12px;color:#aaa;margin-top:10px}
.loader{border:3px solid #333;border-top:3px solid #25D366;border-radius:50%;width:18px;height:18px;animation:spin 1s linear infinite;display:inline-block}
@keyframes spin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
</style></head><body><div class="box">
<img class="logo" src="${directPic}"><h2>${config.botName}</h2><p style="color:#25D366">COMMANDS: 77 Loaded</p>
<input id="num" type="tel" inputmode="numeric" placeholder="923XXXXXXXXX" value="923003719761">
<button id="btn">Get Pair Code</button><div id="code"></div><div id="msg">WhatsApp > Linked Devices > Link with phone number</div></div>
<script>
const btn=document.getElementById('btn');
btn.addEventListener('click', async (e)=>{
 e.preventDefault();
 const n=document.getElementById('num').value.trim();
 const c=document.getElementById('code');
 const m=document.getElementById('msg');
 if(!n){m.innerText='Number likho!';return;}
 btn.innerHTML='<span class=loader></span> Getting...';btn.disabled=true;
 try{
   const r=await fetch('/pair?number='+encodeURIComponent(n));
   const d=await r.json();
   btn.innerText='Get Pair Code';btn.disabled=false;
   if(d.code){c.innerText=d.code;m.innerHTML='✅ Code: <b>'+d.code+'</b><br>WhatsApp me jao > Linked Devices > Link with phone number'; if(navigator.vibrate) navigator.vibrate(200);}else{m.innerHTML='<span style=color:#ff4444>'+(d.error||'Error')+'</span>';}
 }catch(err){btn.innerText='Get Pair Code';btn.disabled=false;m.innerHTML='<span style=color:#ff4444>Server waking up, 30 sec me dobara try karo</span>';c.innerText='';}
});
document.getElementById('num').addEventListener('keydown',(e)=>{if(e.key==='Enter'){btn.click();}});
</script></body></html>`);
});

app.get('/pair', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '');
  if (!num) return res.json({ error: 'Number dalo' });
  const tempDir = path.join(__dirname, 'auth', 'temp_' + num);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempDir);
    const tempSock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) }, logger: pino({ level: 'silent' }), browser: Browsers.macOS('Chrome'), printQRInTerminal: false });
    tempSock.ev.on('creds.update', saveCreds);
    await new Promise(r => setTimeout(r, 1500));
    const code = await tempSock.requestPairingCode(num);
    console.log("✅ PAIR CODE for", num, ":", code);
    res.json({ code });
    setTimeout(() => { try { tempSock.end(); } catch {} }, 90000);
  } catch (e) { console.log("PAIR ERROR:", e.message); res.json({ error: e.message }); }
});

async function startBot() {
  const authDir = path.join(__dirname, 'auth', 'main');
  if (!fs.existsSync(authDir) || fs.readdirSync(authDir).length === 0) return;
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  sock = makeWASocket({ auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) }, logger: pino({ level: 'silent' }), browser: Browsers.macOS('Chrome') });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => { if (u.connection === 'open') console.log("🤖 Connected!"); if (u.connection === 'close') setTimeout(startBot, 3000); });
  sock.ev.on('messages.upsert', async ({ messages }) => { const msg = messages[0]; if (!msg.key.fromMe) await handleMessage(sock, msg); });
}
startBot();
app.listen(PORT, '0.0.0.0', () => console.log('✅ Running on ' + PORT));