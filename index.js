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
  res.send(`
  <html><head><title>RANA FURQAN MD</title><meta name="viewport" content="width=device-width, initial-scale=1">
  <style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:linear-gradient(135deg,#111,#222);border:2px solid #ff0040;border-radius:25px;padding:25px;width:360px;text-align:center;box-shadow:0 0 20px #ff0040}.dp{width:110px;height:110px;border-radius:50%;border:4px solid #ff0040;margin:auto;display:block;box-shadow:0 0 15px #ff0040}h1{color:#ff0040;text-shadow:0 0 10px #ff0040}input{width:90%;padding:13px;border-radius:12px;background:#222;color:#fff;border:1px solid #ff0040;margin:12px 0;text-align:center;font-size:16px}button{width:95%;padding:13px;border-radius:12px;background:linear-gradient(90deg,#ff0040,#ff006a);color:#fff;font-weight:bold;border:none;cursor:pointer;font-size:15px;box-shadow:0 0 10px #ff0040}.code{font-size:38px;color:#00ff88;background:#000;padding:16px;border-radius:12px;border:2px dashed #00ff88;margin:15px 0;letter-spacing:5px;font-weight:bold;box-shadow:0 0 15px #00ff88}</style>
  </head><body><div class="card">
  <img class="dp" src="${config.botImage}"/>
  <h1>🌹 RANA FURQAN MD 🌹</h1>
  <p>OWNER: RANA FURQAN</p>
  <p>STATUS: <b style="color:${status==='CONNECTED'?'#00ff88':'#ff0040'}">${status}</b></p>
  ${status==='CONNECTED'?`<h2 style="color:#00ff88">✅ ONLINE WORKING ✅</h2><p>WhatsApp pe .menu likho</p>`:`
  <form action="/getcode"><input name="number" placeholder="9230XXXXXXXX" value="${config.ownerNumber}" required/><button>🔥 GET 8-LETTER CODE 🔥</button></form>
  ${pairCode?`<div class="code">${pairCode}</div><p style="color:#ff0;font-size:12px">WhatsApp > Linked Devices > Link with phone number<br>20 sec me code dalo!</p>`: `<p style="color:#888;margin-top:15px">RANA FURQAN MD - OFFICIAL PAIR</p>`}
  `}
  <br><a href="/clear"><button style="background:#333;box-shadow:none">CLEAR SESSION</button></a>
  <p style="font-size:10px;color:#666;margin-top:15px">© RANA FURQAN MD - 2026</p>
  </div></body></html>
  `);
});

app.get('/clear', async (req,res)=>{
  try{ if(sock) try{ sock.end(); }catch{} }catch{}
  if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
  status='DISCONNECTED'; pairCode=null; sock=null;
  await delay(1000);
  startBot();
  res.redirect('/');
});

app.get('/getcode', async (req,res)=>{
  let num = (req.query.number||'').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  if(num.startsWith('0')) num='92'+num.slice(1);
  
  console.log(`🌹 RANA FURQAN MD - Getting code for ${num}`);

  try{
    if(!sock){
      await startBot();
      await delay(2000);
    }
    if(sock && !sock.authState.creds.registered){
      await delay(1000);
      let code = await sock.requestPairingCode(num);
      pairCode = code.slice(0,4)+'-'+code.slice(4);
      console.log(`🌹 RANA FURQAN MD CODE: ${pairCode}`);
      setTimeout(()=> pairCode=null, 60000);
    } else {
      pairCode='ALREADY CONNECTED';
    }
  }catch(e){
    console.log('Pair error:', e.message);
    pairCode='ERROR - CLEAR & RETRY';
  }
  res.redirect('/');
});

async function startBot(){
  try{
    if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`🌹 RANA FURQAN MD Starting ${version}`);

    sock = makeWASocket({
      version,
      logger: pino({level:'silent'}),
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      browser: ['RANA FURQAN MD', 'Chrome', '20.0.04'], // ✅ APNA BRAND
      markOnlineOnConnect: true,
      syncFullHistory: false,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u)=>{
      const { connection, lastDisconnect } = u;
      if(connection==='open'){
        status='CONNECTED';
        pairCode=null;
        console.log('🌹 RANA FURQAN MD ONLINE - OFFICIAL 🌹');
      }
      if(connection==='close'){
        const r = lastDisconnect?.error?.output?.statusCode;
        console.log('🌹 RANA FURQAN MD Closed:', r);
        status='DISCONNECTED';
        pairCode=null;
        if(r!==DisconnectReason.loggedOut) setTimeout(startBot, 3000);
      }
    });

    // RANA FURQAN MD COMMANDS LOADER
    let plugins=new Map();
    for(let folder of ['commands','plugins']){
      let pPath=join(__dirname,folder);
      if(fs.existsSync(pPath)){
        let files=fs.readdirSync(pPath).filter(x=>x.endsWith('.js'));
        console.log(`📁 ${folder}: ${files.length} files`);
        for(let f of files){
          try{
            let mod=await import(`file://${join(pPath,f)}?t=${Date.now()}`);
            let p=mod.default||mod;
            if(p.command) plugins.set(f,p);
          }catch{}
        }
      }
    }
    console.log(`🌹 RANA FURQAN MD TOTAL: ${plugins.size} PLUGINS`);

    sock.ev.on('messages.upsert', async (m)=>{
      let msg=m.messages[0]; if(!msg?.message) return;
      let body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
      if(!body.startsWith(config.prefix)) return;
      let args=body.slice(config.prefix.length).trim().split(/ +/); let cmd=args.shift().toLowerCase();
      for(let pl of plugins.values()){
        if(pl.command?.includes(cmd)) await pl(sock,msg,args,{config});
      }
    });

  }catch(e){ console.log('🌹 RANA FURQAN MD Error:', e.message); }
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 RANA FURQAN MD RUNNING ${PORT} 🌹`));