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
let lastNumber = '';
let starting = false;

app.use(express.urlencoded({ extended: true }));
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
  const valid = pairCode && Date.now()-pairTime < 65000;
  const codeBox = valid ? `
    <div style="margin-top:18px;background:#000;border:2px dashed #00ff88;border-radius:15px;padding:15px">
      <div style="color:#ff0;font-size:12px;font-weight:bold">✅ CODE READY - 1 MIN VALID</div>
      <div style="font-family:monospace;font-size:34px;letter-spacing:5px;color:#00ff88;margin:12px 0;font-weight:bold">${pairCode}</div>
      <div style="color:#aaa;font-size:13px;line-height:1.5">WhatsApp > Settings > Linked Devices > Link a Device > <b>Link with Phone Number</b> > Paste this code<br>Number: <b style="color:#fff">${lastNumber}</b></div>
      <div style="color:#ff0;margin-top:10px;font-size:14px;font-weight:bold" id="tm">60s remaining - Page will auto reload</div>
    </div>
    <script>let s=60;setInterval(()=>{s--;let e=document.getElementById('tm');if(e)e.innerText=s+'s remaining';if(s<=0)location.reload()},1000)</script>
  ` : '';

  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.botName}</title>
  <style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px}
  .c{width:100%;max-width:410px;background:#111;border:2px solid #f00;border-radius:20px;padding:24px;text-align:center}
  input{width:100%;padding:14px;border-radius:10px;border:2px solid #f00;background:#000;color:#fff;font-size:19px;text-align:center;box-sizing:border-box;margin-top:10px;outline:none}
  button{width:100%;padding:14px;border-radius:10px;border:0;background:#f00;color:#fff;font-weight:bold;margin-top:12px;cursor:pointer;font-size:15px}
  img{width:105px;height:105px;border-radius:50%;border:3px solid #f00}
  .st{margin:10px 0;padding:8px 16px;border-radius:20px;display:inline-block;font-size:13px;font-weight:bold}
  .CONNECTED{background:#0f0;color:#000} .CONNECTING{background:#ff0;color:#000} .DISCONNECTED{background:#f00;color:#fff}
  </style></head><body><div class="c"><img src="${config.botImage}"><h2>${config.botName}</h2><div class="st ${status}">${status}</div>
  ${status==='CONNECTED'?`<div style="color:#0f0;margin-top:15px"><h3>✅ CONNECTED</h3><p>${countCmd()} Commands Active</p><p style="color:#aaa">Ab WhatsApp pe .menu likho</p></div>`:
  `<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923003719761" required><button type="submit">🔥 GET PAIRING CODE</button></form>${codeBox}${!valid&&lastNumber?'<div style="margin-top:15px;color:#ff0;font-size:13px">⏳ Generating code for '+lastNumber+'... Wait 5 sec then reload</div>':''}`}
  <div style="margin-top:18px;font-size:11px;color:#666">Fixed Pairing V3 - Number will NOT disappear</div></div></body></html>`;
}

app.get('/', (req,res)=>res.send(html()));

async function startBot(num) {
  if(starting) return;
  starting=true;
  try {
    if(num) {
      lastNumber = num;
      cleanAuth();
    }
    if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
    const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();
    console.log('WA Version', version);

    const wa = makeWASocket({
      version, logger, printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      browser: ['Ubuntu','Chrome','20.0.04'],
      markOnlineOnConnect: false,
    });
    sock = wa;
    status='CONNECTING';
    wa.ev.on('creds.update', saveCreds);
    wa.ev.on('messages.upsert', async (m)=>{ try{ await onMessage(wa,m); }catch(e){} });
    wa.ev.on('connection.update', (u)=>{
      const {connection, lastDisconnect} = u;
      if(connection==='open'){ status='CONNECTED'; console.log('CONNECTED'); }
      else if(connection==='connecting') status='CONNECTING';
      else if(connection==='close'){
        const sc = lastDisconnect?.error?.output?.statusCode;
        if(sc!==DisconnectReason.loggedOut) { status='DISCONNECTED'; sock=null; }
      }
    });

    if(num) {
      // Wait 2 sec then request code
      await new Promise(r=>setTimeout(r,2500));
      console.log('Requesting code for', num);
      try {
        let code = await wa.requestPairingCode(num);
        code = code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');
        pairCode = code;
        pairTime = Date.now();
        console.log('✅ CODE:', pairCode);
      } catch(e) {
        console.log('First try failed:', e.message);
        await new Promise(r=>setTimeout(r,2000));
        try {
          let code2 = await wa.requestPairingCode(num);
          code2 = code2.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');
          pairCode = code2;
          pairTime = Date.now();
          console.log('✅ CODE RETRY:', pairCode);
        } catch(e2){ console.log('Retry failed', e2.message); status='DISCONNECTED'; }
      }
    }
    await loadCommands().catch(()=>{});
  } catch(e){ console.log('Start error', e.message); status='DISCONNECTED'; }
  finally{ starting=false; }
}

app.post('/pair', async (req,res)=>{
  const n = normNum(req.body?.num);
  console.log('Pair request for', n);
  if(!n || n.length<11) return res.send('Invalid number, use 923003719761');
  lastNumber = n;
  pairCode = null;
  pairTime = 0;
  status='CONNECTING';
  await startBot(n);
  // Wait up to 8 sec for code before redirect
  for(let i=0;i<8;i++){
    if(pairCode) break;
    await new Promise(r=>setTimeout(r,1000));
  }
  res.redirect('/');
});

app.listen(PORT, ()=>console.log('Bot running on', PORT));
if(fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length>0) startBot();
loadCommands().catch(()=>{});