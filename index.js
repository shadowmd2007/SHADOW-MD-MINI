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

app.get('/', (req,res)=>{
  res.send(`
  <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;border:2px solid red;border-radius:20px;padding:20px;width:360px;text-align:center}.dp{width:100px;height:100px;border-radius:50%;border:3px solid red;margin:auto;display:block}input{width:90%;padding:12px;border-radius:10px;background:#222;color:#fff;border:none;margin:10px 0;text-align:center}button{width:95%;padding:12px;border-radius:10px;background:red;color:#fff;font-weight:bold;border:none} .code{font-size:36px;color:#0f0;background:#000;padding:15px;border:2px dashed #0f0;border-radius:10px;letter-spacing:4px;margin:10px 0}</style></head><body><div class="card">
  <img class="dp" src="${config.botImage}"/><h1>🌹 ${config.botName} 🌹</h1>
  <p>STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'red'}">${status}</b></p>
  ${status==='CONNECTED'?`<h2 style="color:#0f0">✅ ONLINE ✅</h2><p>.menu likho WhatsApp pe</p>`:`
  <form action="/getcode"><input name="number" value="${config.ownerNumber}" required/><button>GET 8-LETTER CODE</button></form>
  ${pairCode?`<div class="code">${pairCode}</div><p style="color:yellow;font-size:12px">WhatsApp > Linked Devices > Link with phone number<br>Code 60 sec me dalo</p>`:``}
  `}
  <a href="/logout"><button style="background:#333;margin-top:10px">CLEAR SESSION</button></a>
  </div></body></html>
  `);
});

app.get('/logout', (req,res)=>{
  try{ if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true}); status='DISCONNECTED'; pairCode=null; }catch{}
  console.log('Cleared');
  setTimeout(()=> { startBot(); }, 1000);
  res.redirect('/');
});

let globalSock = null;

async function startBot(){
  try{
    if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log('Starting - Safari iPhone');

    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      logger: pino({level:'silent'}),
      browser: ['Safari', 'iPhone', '16.0'],
      printQRInTerminal: false,
      markOnlineOnConnect: true,
    });

    globalSock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (u)=>{
      const { connection, lastDisconnect } = u;
      if(connection==='open'){
        status='CONNECTED';
        pairCode=null;
        console.log('🌹 CONNECTED - RANA FURQAN MD ONLINE 🌹');
      }
      if(connection==='close'){
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed:', reason);
        status='DISCONNECTED';
        pairCode=null;
        if(reason!==DisconnectReason.loggedOut){
          setTimeout(startBot, 3000);
        }
      }
    });

    // LOAD COMMANDS
    let plugins = new Map();
    for(let folder of ['commands','plugins']){
      const pPath = join(__dirname, folder);
      if(fs.existsSync(pPath)){
        const files = fs.readdirSync(pPath).filter(x=>x.endsWith('.js'));
        for(let f of files){
          try{ const mod = await import(`file://${join(pPath,f)}?t=${Date.now()}`); const p=mod.default||mod; if(p.command) plugins.set(f,p); }catch(e){}
        }
      }
    }
    console.log(`TOTAL: ${plugins.size} files`);

    sock.ev.on('messages.upsert', async (m)=>{
      const msg=m.messages[0]; if(!msg?.message) return;
      const body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
      if(!body.startsWith(config.prefix)) return;
      const args=body.slice(config.prefix.length).trim().split(/ +/); const cmd=args.shift().toLowerCase();
      for(let p of plugins.values()){ if(p.command?.includes(cmd)) await p(sock,msg,args,{config}); }
    });

  }catch(e){ console.log('Error:', e.message); status='DISCONNECTED'; }
}

app.get('/getcode', async (req,res)=>{
  let num = (req.query.number||'').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  if(num.startsWith('0')) num = '92'+num.slice(1);

  try{
    if(!globalSock) { res.redirect('/'); return; }
    if(globalSock.authState.creds.registered){
      pairCode = 'ALREADY PAIRED';
      res.redirect('/'); return;
    }
    console.log(`Requesting code for ${num}`);
    await delay(1000);
    let code = await globalSock.requestPairingCode(num);
    code = code.slice(0,4)+'-'+code.slice(4);
    pairCode = code;
    console.log(`CODE: ${code}`);
    setTimeout(()=> { pairCode=null; }, 60000);
  }catch(e){
    console.log('Pair error:', e.message);
    pairCode = 'RETRY - CLEAR FIRST';
  }
  res.redirect('/');
});

startBot();
app.listen(PORT, ()=> console.log(`Running on ${PORT}`));