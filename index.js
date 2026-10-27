import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;

let status = 'DISCONNECTED';
let pairCode = null;
let pairExpiry = 0;
let currentSock = null;

app.get('/', (req, res) => {
  if(pairCode && Date.now() > pairExpiry) pairCode = null;
  res.send(`<!DOCTYPE html><html><head><title>🌹 ${config.botName} 🌹</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#111;border:2px solid red;border-radius:20px;padding:20px;width:360px;text-align:center}.dp{width:100px;height:100px;border-radius:50%;border:3px solid red;margin:auto;display:block}input{width:90%;padding:12px;border-radius:10px;background:#222;color:#fff;border:none;margin:10px 0;text-align:center}button{width:95%;padding:12px;border-radius:10px;background:red;color:#fff;font-weight:bold;border:none;cursor:pointer}.code{font-size:32px;color:#0f0;background:#000;padding:12px;border:2px dashed #0f0;border-radius:10px;margin-top:10px;letter-spacing:3px}</style></head><body><div class="card"><img class="dp" src="${config.botImage}"/><h1>🌹 ${config.botName} 🌹</h1><p>STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'red'}">${status}</b></p>${status==='CONNECTED'?`<h2 style="color:#0f0">✅ CONNECTED ✅</h2><p>.menu likho WhatsApp pe</p><a href="/logout"><button>LOGOUT</button></a>`: `<form action="/getcode"><input name="number" value="${config.ownerNumber}" required/><button>GET PAIR CODE</button></form>${pairCode?`<div class="code">${pairCode}</div><p style="color:yellow;font-size:11px">WhatsApp > Linked Devices > Link with phone number<br>Code 30 sec me dalo!</p>`:''}<a href="/logout"><button style="background:#333;margin-top:10px">CLEAR SESSION - NEW CODE</button></a>`}</div></body></html>`);
});

app.get('/logout', async (req,res)=>{
  try{
    if(currentSock){ try{ currentSock.end(); }catch{} }
    if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
    status='DISCONNECTED'; pairCode=null; currentSock=null;
    console.log('🌹 Session Fully Cleared');
  }catch{}
  res.redirect('/');
});

async function startPairing(num){
  try{
    // ✅ FIX 1: PURANA SESSION FULL DELETE - Yahi masla tha!
    if(fs.existsSync(config.authDir)){
      fs.rmSync(config.authDir,{recursive:true,force:true});
      console.log('🌹 Old auth deleted');
    }
    fs.mkdirSync(config.authDir,{recursive:true});
    await delay(1000);

    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`🌹 Pairing ${num} - Chrome Stable`);
    
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Chrome', 'Windows', '10.0'], // ✅ FIX 2: Chrome se pairing 100% hota hai, Safari se error ata hai
    });
    
    currentSock = sock;
    sock.ev.on('creds.update', saveCreds);
    
    // ✅ FIX 3: Jaldi code mango, zyada delay nahi
    await delay(2000);
    
    if(!sock.authState.creds.registered){
      let code = await sock.requestPairingCode(num);
      code = code?.match(/.{1,4}/g)?.join('-') || code;
      pairCode = code;
      pairExpiry = Date.now()+60000; // 60 sec
      console.log(`🌹 NEW CODE: ${code} - 60 sec me use karo`);
    }

    sock.ev.on('connection.update', async (u)=>{
      if(u.connection==='open'){
        console.log('🌹 PAIR SUCCESS - CONNECTED 🌹');
        status='CONNECTED';
        pairCode=null;
        setTimeout(()=> startBot(),2000);
      }
    });

  }catch(e){
    console.log('Pair error:', e.message);
    pairCode = `ERROR: ${e.message}`;
  }
}

app.get('/getcode', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  startPairing(num);
  setTimeout(()=> res.redirect('/'),3000);
});

async function startBot(){
  try{
    if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){
      status='DISCONNECTED';
      return;
    }
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      logger: pino({level:'silent'}),
      browser: ['Safari', 'iPhone', '16.0'], // Bot chalne ke baad Safari dikhega
      markOnlineOnConnect: true,
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u)=>{
      if(u.connection==='open'){ status='CONNECTED'; console.log('🌹 ONLINE SAFARI 🌹'); }
      if(u.connection==='close'){
        const r=u.lastDisconnect?.error?.output?.statusCode;
        if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000);
        else status='DISCONNECTED';
      }
    });

    let plugins = new Map();
    for(let folder of ['commands','plugins']){
      const pPath = join(__dirname, folder);
      if(fs.existsSync(pPath)){
        const files = fs.readdirSync(pPath).filter(x=>x.endsWith('.js'));
        for(let f of files){
          try{
            const mod = await import(`file://${join(pPath,f)}?t=${Date.now()}`);
            const p = mod.default || mod;
            if(p.command) plugins.set(f, p);
          }catch{}
        }
      }
    }
    console.log(`🌹 TOTAL: ${plugins.size} files`);

    sock.ev.on('messages.upsert', async (m)=>{
      const msg=m.messages[0];
      if(!msg?.message) return;
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      if(!body.startsWith(config.prefix)) return;
      const args=body.slice(config.prefix.length).trim().split(/ +/);
      const cmd=args.shift().toLowerCase();
      for(let p of plugins.values()){
        if(p.command?.includes(cmd)) await p(sock, msg, args, {config});
      }
    });
  }catch(e){ console.log(e.message); }
}

startBot();
app.listen(PORT, ()=> console.log(`Running ${PORT}`));