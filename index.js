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

app.get('/', (req,res)=>{
  res.send(`<html><head><title>RANA FURQAN MD</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
  body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}
  .card{background:linear-gradient(145deg,#111,#1a1a1a);border:2px solid #ff0040;border-radius:25px;padding:25px;width:360px;text-align:center;box-shadow:0 0 25px #ff0040}
  .dp{width:120px;height:120px;border-radius:50%;border:4px solid #ff0040;box-shadow:0 0 20px #ff0040;margin:auto;display:block}
  h1{color:#ff0040;text-shadow:0 0 15px #ff0040;margin:15px 0}
  input{width:90%;padding:14px;border-radius:12px;background:#222;color:#fff;border:1px solid #ff0040;margin:12px 0;text-align:center;font-size:16px;outline:none}
  button{width:95%;padding:14px;border-radius:12px;background:linear-gradient(90deg,#ff0040,#ff006a);color:#fff;font-weight:bold;border:none;cursor:pointer;font-size:16px;box-shadow:0 0 15px #ff0040}
  .code{font-size:40px;color:#00ff88;background:#000;padding:18px;border-radius:15px;border:3px dashed #00ff88;margin:15px 0;letter-spacing:6px;font-weight:bold;box-shadow:0 0 20px #00ff88;animation:glow 1s infinite alternate}
  @keyframes glow{from{box-shadow:0 0 10px #00ff88}to{box-shadow:0 0 25px #00ff88}}
  </style></head><body><div class="card">
  <img class="dp" src="${config.botImage}"/>
  <h1>🌹 RANA FURQAN MD 🌹</h1>
  <p>OWNER: RANA FURQAN</p>
  <h3 style="color:${status==='CONNECTED'?'#00ff88':'#ff0040'}">${status}</h3>
  ${status==='CONNECTED'?`<h2 style="color:#00ff88">✅ FULL CONNECTED ✅</h2><p>WhatsApp pe .menu likho</p>`:`<form action="/pair"><input name="num" placeholder="92300XXXXXXXX" value="${config.ownerNumber}" required/><button>🔥 GET 8-LETTER CODE 🔥</button></form>
  ${pairCode?`<div class="code">${pairCode}</div><p style="color:#ff0;font-size:12px">WhatsApp > Linked Devices<br>Link with phone number<br>20 sec me dalo!</p><p style="color:#0f0;font-size:10px">Code: ${pairCode} - Jaldi dalo!</p>`: `<p style="color:#888;font-size:12px;margin-top:15px">8 Letter Code yahan ayega</p>`}
  `}
  <br><a href="/clear"><button style="background:#222;box-shadow:none;border:1px solid #333">CLEAR</button></a>
  <p style="font-size:10px;color:#555;margin-top:15px">© RANA FURQAN MD - 2026 - 8 LETTER PAIR</p>
  </div></body></html>`);
});

app.get('/clear', async (req,res)=>{
  try{ if(sock) sock.end(); }catch{}
  if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
  status='DISCONNECTED'; pairCode=null; sock=null;
  await delay(800);
  startBot();
  res.redirect('/');
});

app.get('/pair', async (req,res)=>{
  let num = (req.query.num||'').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  if(num.startsWith('0')) num='92'+num.slice(1);
  console.log(`🌹 RANA FURQAN MD PAIR: ${num}`);

  try{
    // ✅ Har baar fresh auth - Yahi fix hai Couldn't link ka
    if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
    fs.mkdirSync(config.authDir,{recursive:true});
    await delay(500);

    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
      version,
      logger: pino({level:'silent'}),
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      browser: ['RANA FURQAN MD', 'Chrome', '1.0.0'], // ✅ RANA FURQAN BRAND
      markOnlineOnConnect: false,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
    });

    sock.ev.on('creds.update', saveCreds);
    
    // ✅ 3 sec ruko fir code mango - Yahi working trick hai
    await delay(3000);
    
    if(!sock.authState.creds.registered){
      let code = await sock.requestPairingCode(num);
      pairCode = code?.match(/.{1,4}/g)?.join('-') || code;
      console.log(`🌹 RANA FURQAN MD CODE: ${pairCode} FOR ${num}`);
      setTimeout(()=> pairCode=null, 90000);
    }

    sock.ev.on('connection.update', async (u)=>{
      const { connection, lastDisconnect } = u;
      if(connection==='open'){
        status='CONNECTED';
        pairCode=null;
        console.log('🌹 RANA FURQAN MD FULL CONNECTED 🌹');
      }
      if(connection==='close'){
        const code = lastDisconnect?.error?.output?.statusCode;
        if(code===DisconnectReason.loggedOut){
          status='DISCONNECTED';
          if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
        } else if(status!=='CONNECTED'){
          status='DISCONNECTED';
        }
      }
    });

  }catch(e){
    console.log('Pair error:', e.message);
    pairCode='ERROR - CLEAR KARO';
  }
  res.redirect('/');
});

async function startBot(){
  try{
    if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
    const files = fs.readdirSync(config.authDir);
    if(files.length===0){ status='DISCONNECTED'; console.log('🌹 RANA FURQAN MD - Waiting for pair'); return; }
    
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    sock = makeWASocket({
      version,
      logger: pino({level:'silent'}),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      browser: ['RANA FURQAN MD','Chrome','1.0.0'],
      markOnlineOnConnect: true,
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u)=>{
      if(u.connection==='open'){ status='CONNECTED'; console.log('🌹 RANA FURQAN MD ONLINE 🌹'); }
      if(u.connection==='close'){
        let r=u.lastDisconnect?.error?.output?.statusCode;
        status='DISCONNECTED';
        if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000);
      }
    });

    // Commands load
    let plugins=new Map();
    for(let d of ['commands','plugins']){
      let p=join(__dirname,d);
      if(fs.existsSync(p)){
        for(let f of fs.readdirSync(p).filter(x=>x.endsWith('.js'))){
          try{ let m=await import(`file://${join(p,f)}?t=${Date.now()}`); let pl=m.default||m; if(pl.command) plugins.set(f,pl); }catch{}
        }
      }
    }
    console.log(`🌹 ${plugins.size} plugins`);
    sock.ev.on('messages.upsert', async (m)=>{
      let msg=m.messages[0]; if(!msg?.message) return;
      let body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
      if(!body.startsWith(config.prefix)) return;
      let args=body.slice(config.prefix.length).trim().split(/ +/); let cmd=args.shift().toLowerCase();
      for(let pl of plugins.values()){ if(pl.command?.includes(cmd)) await pl(sock,msg,args,{config}); }
    });
  }catch(e){ console.log(e.message); status='DISCONNECTED'; }
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 RANA FURQAN MD 8-LETTER PAIR RUNNING ${PORT} 🌹`));