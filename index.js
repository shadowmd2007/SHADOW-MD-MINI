import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import makeWASocket, { useMultiFileAuthState, delay, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

let pairCode = null;
let status = 'DISCONNECTED';
let sock = null;
let lastNumber = null;

app.get('/', (req,res)=>{
  res.send(`<html><head><title>RANA FURQAN MD</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;border:2px solid #ff0040;border-radius:20px;padding:20px;width:360px;text-align:center}.dp{width:100px;height:100px;border-radius:50%;border:3px solid #ff0040;margin:auto;display:block}input{width:90%;padding:12px;border-radius:10px;background:#222;color:#fff;border:none;margin:10px 0;text-align:center}button{width:95%;padding:12px;border-radius:10px;background:#ff0040;color:#fff;font-weight:bold;border:none}.code{font-size:36px;color:#0f0;background:#000;padding:15px;border:2px dashed #0f0;border-radius:10px;letter-spacing:4px;margin:10px 0}</style></head><body><div class="card">
  <img class="dp" src="${config.botImage}"/><h1>🌹 RANA FURQAN MD 🌹</h1><p>STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'#ff0040'}">${status}</b></p>
  ${status==='CONNECTED'?`<h2 style="color:#0f0">✅ CONNECTED ✅</h2>`:`
  <form action="/getcode"><input name="number" placeholder="Apna WhatsApp Number" value="${config.ownerNumber}" required/><button>GET CODE</button></form>
  ${pairCode?`<div class="code">${pairCode}</div><p style="color:yellow;font-size:11px">Number: ${lastNumber}<br>Isi number wale WhatsApp me code dalo!<br>Linked Devices > Link with phone number</p>`:``}
  `}<br><a href="/clear"><button style="background:#333">CLEAR SESSION</button></a></div></body></html>`);
});

app.get('/clear', async (req,res)=>{
  try{ if(sock) sock.end(); }catch{}
  if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
  status='DISCONNECTED'; pairCode=null; sock=null; lastNumber=null;
  await delay(1000); startBot(); res.redirect('/');
});

app.get('/getcode', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  if(num.startsWith('0')) num='92'+num.slice(1);
  lastNumber=num;
  console.log(`🌹 RANA FURQAN MD Code for ${num}`);
  try{
    // ✅ FIX: Hamesha fresh auth se code mango
    if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
    fs.mkdirSync(config.authDir,{recursive:true});
    await delay(500);
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({ version, logger:pino({level:'silent'}), auth:{ creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'})) }, browser:['RANA FURQAN MD','Chrome','20.0.04'], printQRInTerminal:false, markOnlineOnConnect:false });
    sock.ev.on('creds.update', saveCreds);
    await delay(2500);
    let code=await sock.requestPairingCode(num);
    pairCode=code.slice(0,4)+'-'+code.slice(4);
    console.log(`🌹 CODE: ${pairCode} for ${num}`);
    setTimeout(()=>pairCode=null,60000);
    sock.ev.on('connection.update', (u)=>{ if(u.connection==='open'){ status='CONNECTED'; pairCode=null; console.log('🌹 RANA FURQAN MD CONNECTED 🌹'); setTimeout(()=>startBot(),1000); } });
  }catch(e){ console.log(e.message); pairCode='ERROR - CLEAR & RETRY'; }
  res.redirect('/');
});

async function startBot(){
  try{
    if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
    if(fs.readdirSync(config.authDir).length===0){ status='DISCONNECTED'; return; }
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    sock=makeWASocket({ version, logger:pino({level:'silent'}), auth:{ creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'})) }, browser:['RANA FURQAN MD','Chrome','20.0.04'], markOnlineOnConnect:true });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u)=>{ if(u.connection==='open'){ status='CONNECTED'; console.log('🌹 RANA FURQAN MD ONLINE 🌹'); } if(u.connection==='close'){ let r=u.lastDisconnect?.error?.output?.statusCode; status='DISCONNECTED'; if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000); } });
    let plugins=new Map(); for(let d of ['commands','plugins']){ let p=join(__dirname,d); if(fs.existsSync(p)){ for(let f of fs.readdirSync(p).filter(x=>x.endsWith('.js'))){ try{ let m=await import(`file://${join(p,f)}?t=${Date.now()}`); let pl=m.default||m; if(pl.command) plugins.set(f,pl); }catch{} } } } console.log(`TOTAL: ${plugins.size}`);
    sock.ev.on('messages.upsert', async (m)=>{ let msg=m.messages[0]; if(!msg?.message) return; let body=msg.message.conversation||msg.message.extendedTextMessage?.text||''; if(!body.startsWith(config.prefix)) return; let args=body.slice(config.prefix.length).trim().split(/ +/); let cmd=args.shift().toLowerCase(); for(let pl of plugins.values()){ if(pl.command?.includes(cmd)) await pl(sock,msg,args,{config}); } });
  }catch(e){ console.log(e.message); }
}

startBot();
app.listen(PORT, ()=>console.log(`RANA FURQAN MD Running ${PORT}`));