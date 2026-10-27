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

app.get('/', (req, res) => {
  if(pairCode && Date.now() > pairExpiry) pairCode = null;
  res.send(`<!DOCTYPE html><html><head><title>🌹 ${config.botName} 🌹</title><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#111;border:2px solid red;border-radius:20px;padding:20px;width:360px;text-align:center;box-shadow:0 0 15px red}.dp{width:100px;height:100px;border-radius:50%;border:3px solid red;margin:auto;display:block}h1{color:red}input{width:90%;padding:12px;border-radius:10px;background:#222;color:#fff;border:none;margin:10px 0;text-align:center}button{width:95%;padding:12px;border-radius:10px;background:red;color:#fff;font-weight:bold;border:none;cursor:pointer;margin:5px 0}.code{font-size:34px;color:#0f0;background:#000;padding:15px;border-radius:10px;border:2px dashed #0f0;margin:10px 0;letter-spacing:4px;font-weight:bold}</style></head><body><div class="card"><img class="dp" src="${config.botImage}"/><h1>🌹 ${config.botName} 🌹</h1><p>STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'red'}">${status}</b></p>${status==='CONNECTED'?`<h2 style="color:#0f0">✅ ONLINE WORKING ✅</h2><p>WhatsApp pe .menu likho</p><a href="/logout"><button>LOGOUT</button></a>`: `<form action="/pair"><input name="number" placeholder="92300XXXXXXX" value="${config.ownerNumber}" required/><button type="submit">GET 8-LETTER CODE</button></form>${pairCode?`<div class="code">${pairCode}</div><p style="color:yellow;font-size:12px">WhatsApp > Linked Devices > Link with phone number<br>Code 60 sec me dalo - Fast!</p>`: `<p style="color:#888;font-size:11px">Number dal ke button dabao<br>8 letter code ayega</p>`}<a href="/logout"><button style="background:#333">CLEAR SESSION</button></a>`}</div></body></html>`);
});

app.get('/logout', (req,res)=>{
  try{ if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true}); status='DISCONNECTED'; pairCode=null; console.log('Session cleared'); }catch{}
  res.redirect('/');
});

let sockPair = null;

async function getPairCode(num){
  try{
    // Purana auth delete mat karo agar already code manga hai - yahi fix hai
    if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
    
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    if(sockPair) { try{ sockPair.end(); }catch{} }

    console.log(`🌹 Getting Pair Code for ${num} - Safari iPhone`);

    sockPair = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Safari', 'iPhone', '16.0'], // ✅ 1000 bots me yahi chal raha hai - Safari se hi pair hota hai
      markOnlineOnConnect: false,
    });

    sockPair.ev.on('creds.update', saveCreds);

    await delay(3000);

    if(!sockPair.authState.creds.registered){
      let code = await sockPair.requestPairingCode(num);
      code = code.slice(0,4) + '-' + code.slice(4); // 8 letter ko XXXX-XXXX banao
      pairCode = code;
      pairExpiry = Date.now() + 60000;
      console.log(`🌹 PAIR CODE: ${code}`);
    }

    sockPair.ev.on('connection.update', async (u)=>{
      if(u.connection==='open'){
        console.log('🌹 PAIRED & CONNECTED 🌹');
        status='CONNECTED';
        pairCode=null;
        setTimeout(()=> startBot(),1000);
      }
      if(u.connection==='close'){
        const c=u.lastDisconnect?.error?.output?.statusCode;
        console.log('Pair sock closed:', c);
        if(c!==DisconnectReason.loggedOut && status!=='CONNECTED'){
          // Pair fail hua to dobara try nahi karna
        }
      }
    });

  }catch(e){
    console.log('Pair error:', e.message);
    pairCode = 'ERROR - RETRY';
  }
}

app.get('/pair', async (req,res)=>{
  let num = (req.query.number||'').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  if(num.startsWith('0')) num = '92' + num.slice(1); // 0300 -> 92300 fix
  console.log(`Request code for ${num}`);
  getPairCode(num);
  setTimeout(()=> res.redirect('/'),3500);
});

async function startBot(){
  try{
    if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){
      status='DISCONNECTED';
      console.log('No auth - need pair');
      return;
    }
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      logger: pino({level:'silent'}),
      browser: ['Safari', 'iPhone', '16.0'],
      markOnlineOnConnect: true,
    });
    
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u)=>{
      if(u.connection==='open'){ status='CONNECTED'; console.log('🌹 RANA FURQAN MD ONLINE - SAFARI 🌹'); }
      if(u.connection==='close'){
        const r=u.lastDisconnect?.error?.output?.statusCode;
        console.log('Bot closed:', r);
        status='DISCONNECTED';
        if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000);
      }
    });

    // AUTO LOAD COMMANDS
    let plugins = new Map();
    for(let folder of ['commands','plugins']){
      const pPath = join(__dirname, folder);
      if(fs.existsSync(pPath)){
        const files = fs.readdirSync(pPath).filter(x=>x.endsWith('.js'));
        console.log(`📁 ${folder}: ${files.length} files`);
        for(let f of files){
          try{ const mod = await import(`file://${join(pPath,f)}?t=${Date.now()}`); const p=mod.default||mod; if(p.command) plugins.set(f,p); }catch(e){ console.log(e.message); }
        }
      }
    }
    console.log(`🌹 TOTAL: ${plugins.size} FILES - MENU AUTO`);

    sock.ev.on('messages.upsert', async (m)=>{
      const msg=m.messages[0]; if(!msg?.message) return;
      const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
      if(!body.startsWith(config.prefix)) return;
      const args=body.slice(config.prefix.length).trim().split(/ +/); const cmd=args.shift().toLowerCase();
      for(let p of plugins.values()){ if(p.command?.includes(cmd)) await p(sock, msg, args, {config}); }
    });

  }catch(e){ console.log(e.message); }
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 8-LETTER CODE FILE Running ${PORT}`));