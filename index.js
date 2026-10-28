import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import baileys from '@whiskeysockets/baileys';
const { default: makeWASocket, useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } = baileys;
import { config } from './config.js';
import { onMessage, loadCommands } from './handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_DIR = path.resolve(__dirname, './auth');
const logger = pino({ level: 'silent' });

let sock = null;
let status = 'DISCONNECTED';
let pairCode = null;
let pairTime = 0;
let starting = false;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

function cleanAuth() {
  try { if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {}
  try { fs.mkdirSync(AUTH_DIR, { recursive: true }); } catch {}
}
function normNum(v) {
  let n = String(v||'').replace(/\D/g,'');
  if(n.startsWith('0')) n = '92'+n.slice(1);
  return n;
}
function countCmd() {
  try { return fs.readdirSync(path.join(__dirname,'./commands')).filter(f=>f.endsWith('.js')).length; } catch { return 0; }
}
function html() {
  const valid = pairCode && Date.now()-pairTime < 60000;
  const codeBox = valid ? `<div style="margin-top:18px;background:#000;border:2px dashed #00ff88;border-radius:15px;padding:15px"><div style="color:#ff0;font-size:12px;font-weight:bold">✅ CODE GENERATED - 1 MIN VALID</div><div style="font-family:monospace;font-size:32px;letter-spacing:5px;color:#00ff88;margin:10px 0;font-weight:bold">${pairCode}</div><div style="color:#aaa;font-size:13px">WhatsApp > Linked Devices > Link with Phone Number > Paste this code</div><div style="color:#ff0;margin-top:8px;font-size:13px" id="t">60s remaining</div></div><script>let s=60;setInterval(()=>{s--;let e=document.getElementById('t');if(e)e.innerText=s+'s';if(s<=0)location.reload()},1000)</script>` : pairCode?`<div style="margin-top:15px;color:#f55">⏰ Expired - Get New Code</div>`:'';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.botName}</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px} .c{width:100%;max-width:400px;background:#111;border:2px solid #f00;border-radius:20px;padding:25px;text-align:center} input{width:100%;padding:14px;border-radius:10px;border:2px solid #f00;background:#000;color:#fff;font-size:18px;text-align:center;box-sizing:border-box;margin-top:10px} button{width:100%;padding:14px;border-radius:10px;border:0;background:#f00;color:#fff;font-weight:bold;margin-top:10px;cursor:pointer} img{width:100px;height:100px;border-radius:50%;border:2px solid #f00}</style></head><body><div class="c"><img src="${config.botImage}"><h2>${config.botName}</h2><div>${status}</div>${status==='CONNECTED'?`<div style="color:#0f0;margin-top:15px">✅ CONNECTED - ${countCmd()} Commands</div>`:`<form method="post" action="/pair"><input name="num" placeholder="923001234567" required><button>GET PAIRING CODE</button></form>${codeBox}`}<div style="margin-top:15px;font-size:11px;color:#555">Fixed Pairing Edition</div></div></body></html>`;
}

app.get('/', (req,res)=>res.send(html()));

async function startBot(num) {
  if(starting) return;
  starting=true;
  try {
    if(num) cleanAuth();
    if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
    const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();
    console.log('Using WA version', version);
    
    const wa = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      browser: ['Ubuntu','Chrome','20.0.04'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });
    sock = wa;
    wa.ev.on('creds.update', saveCreds);
    wa.ev.on('messages.upsert', async (m)=>{ try{ await onMessage(wa,m); }catch{} });
    wa.ev.on('connection.update', (u)=>{
      const {connection, lastDisconnect} = u;
      if(connection==='open'){ status='CONNECTED'; pairCode=null; console.log('✅ CONNECTED'); }
      else if(connection==='connecting') status='CONNECTING';
      else if(connection==='close'){
        status='DISCONNECTED';
        const sc = lastDisconnect?.error?.output?.statusCode;
        sock=null;
        if(sc!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000);
      }
    });

    if(num) {
      // MOST IMPORTANT: Request pairing code within 10 sec, with retry
      setTimeout(async ()=>{
        try {
          if(sock!==wa) return;
          console.log('Requesting code for', num);
          let code = await wa.requestPairingCode(num);
          code = code?.replace(/[^A-Z0-9]/gi,'').toUpperCase().match(/.{1,4}/g)?.join('-') || code;
          pairCode = code;
          pairTime = Date.now();
          console.log('✅ PAIR CODE:', pairCode);
        } catch(e) {
          console.log('Pair fail', e.message);
          try {
            await new Promise(r=>setTimeout(r,2000));
            let code2 = await wa.requestPairingCode(num);
            code2 = code2?.replace(/[^A-Z0-9]/gi,'').toUpperCase().match(/.{1,4}/g)?.join('-') || code2;
            pairCode = code2; pairTime = Date.now();
            console.log('✅ PAIR CODE RETRY:', pairCode);
          } catch(e2){ console.log('Retry fail', e2.message); }
        }
      }, 3000);
    }
    await loadCommands().catch(()=>{});
  } catch(e){ console.log('Start error', e.message); status='DISCONNECTED'; }
  finally{ starting=false; }
}

app.post('/pair', async (req,res)=>{
  const n = normNum(req.body?.num);
  if(!n || n.length<11) return res.send('Invalid number - use 923001234567');
  pairCode=null;
  status='CONNECTING';
  await startBot(n);
  setTimeout(()=>res.redirect('/'), 2000);
});

app.listen(PORT, ()=>console.log('Bot on', PORT));
if(fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length>0) startBot();
loadCommands().catch(()=>{});