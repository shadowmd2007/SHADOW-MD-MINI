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

app.use(express.json());

// ✅ MAIN PAGE - PAIR CODE UI
app.get('/', (req, res) => {
  if(pairCode && Date.now() > pairExpiry) pairCode = null;
  
  res.send(`<!DOCTYPE html>
<html>
<head>
<title>🌹 ${config.botName} 🌹</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#111;border:2px solid red;border-radius:20px;padding:25px;width:360px;text-align:center;box-shadow:0 0 20px red}
.dp{width:100px;height:100px;border-radius:50%;border:3px solid red;margin:auto;display:block}
h1{color:red;font-size:20px}
input{width:90%;padding:12px;border-radius:10px;border:none;background:#222;color:#fff;margin:10px 0;text-align:center}
button{width:95%;padding:12px;border-radius:10px;border:none;background:red;color:#fff;font-weight:bold;cursor:pointer;margin:5px 0}
.code{font-size:32px;letter-spacing:4px;color:#0f0;background:#000;padding:12px;border-radius:10px;border:2px dashed #0f0;margin-top:15px}
.status{padding:8px;border-radius:8px;margin:10px 0}
.connected{background:#003300;color:#0f0;border:1px solid #0f0}
.disconnected{background:#330000;color:#ff5555;border:1px solid red}
</style>
</head>
<body>
<div class="card">
<img class="dp" src="${config.botImage}"/>
<h1>🌹 ${config.botName} 🌹</h1>
<div class="status ${status==='CONNECTED'?'connected':'disconnected'}">STATUS: ${status}</div>

${status==='CONNECTED' ? `
<h2 style="color:#0f0">✅ ONLINE WORKING ✅</h2>
<p>WhatsApp pe <b>.menu</b> likho</p>
<a href="/logout"><button style="background:#333">LOGOUT / NEW PAIR</button></a>
` : `
<form action="/getcode" method="GET">
<input name="number" placeholder="92300XXXXXXX" value="${config.ownerNumber}" required/>
<button type="submit">GET PAIR CODE</button>
</form>
${pairCode ? `
<div class="code">${pairCode}</div>
<p style="color:yellow;font-size:12px">WhatsApp > Linked Devices > Link with phone number > Code paste karo</p>
<p style="color:#aaa;font-size:11px">Code 2 minute me expire hoga</p>
` : `<p style="color:#888;font-size:12px">Number daal ke GET PAIR CODE dabao</p>`}
<a href="/logout"><button style="background:#222;font-size:12px">CLEAR SESSION</button></a>
`}

</div>
</body>
</html>`);
});

app.get('/logout', (req,res)=>{
  try{
    if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
    status='DISCONNECTED';
    pairCode=null;
    console.log('🌹 Session cleared');
  }catch{}
  res.redirect('/');
});

async function startPairing(num){
  try{
    if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`🌹 Pairing ${num} - Safari`);
    
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Safari', 'iPhone', '16.0'],
    });
    
    sock.ev.on('creds.update', saveCreds);
    await delay(3000);
    
    if(!sock.authState.creds.registered){
      let code = await sock.requestPairingCode(num);
      code = code.includes('-') ? code : code.slice(0,4)+'-'+code.slice(4);
      pairCode = code;
      pairExpiry = Date.now()+120000;
      console.log(`🌹 CODE: ${code}`);
    }
    
    sock.ev.on('connection.update', async (u)=>{
      if(u.connection==='open'){
        console.log('🌹 PAIR SUCCESS 🌹');
        status='CONNECTED';
        pairCode=null;
        setTimeout(()=> startBot(),2000);
      }
      if(u.connection==='close'){
        const c=u.lastDisconnect?.error?.output?.statusCode;
        console.log(`Pair closed: ${c}`);
      }
    });
  }catch(e){ console.log('Pair error:', e.message); }
}

app.get('/getcode', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  console.log(`Getting code for ${num}`);
  startPairing(num);
  setTimeout(()=> res.redirect('/'),3500);
});

async function startBot(){
  try{
    if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){
      status='DISCONNECTED';
      console.log('No auth - need pairing');
      return;
    }
    console.log('Starting Bot...');
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Safari', 'iPhone', '16.0'],
      markOnlineOnConnect: true,
    });
    
    sock.ev.on('creds.update', saveCreds);
    
    sock.ev.on('connection.update', async (u)=>{
      if(u.connection==='open'){
        status='CONNECTED';
        console.log('🌹 RANA FURQAN MD - ONLINE ✅ SAFARI 🌹');
      }
      if(u.connection==='close'){
        const r=u.lastDisconnect?.error?.output?.statusCode;
        console.log('Bot closed:', r, u.lastDisconnect?.error?.message);
        status='DISCONNECTED';
        if(r!==DisconnectReason.loggedOut){
          setTimeout(startBot,3000);
        }
      }
    });

    // ✅ AUTO LOAD COMMANDS + PLUGINS
    let plugins = new Map();
    for(let folder of ['commands','plugins']){
      const pPath = join(__dirname, folder);
      if(fs.existsSync(pPath)){
        const files = fs.readdirSync(pPath).filter(x=>x.endsWith('.js'));
        console.log(`📁 ${folder}: ${files.length} files`);
        for(let f of files){
          try{
            const mod = await import(`file://${join(pPath,f)}?update=${Date.now()}`);
            const plugin = mod.default || mod;
            if(plugin.command){
              plugins.set(f, plugin);
            }
          }catch(e){ console.log(`❌ ${f}: ${e.message}`); }
        }
      }
    }
    console.log(`🌹 TOTAL: ${plugins.size} files loaded`);

    sock.ev.on('messages.upsert', async (m)=>{
      try{
        const msg=m.messages[0];
        if(!msg.message) return;
        const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
        if(!body.startsWith(config.prefix)) return;
        const args=body.slice(config.prefix.length).trim().split(/ +/);
        const cmd=args.shift().toLowerCase();
        for(let p of plugins.values()){
          if(p.command?.includes(cmd)){
            await p(sock, msg, args, {config});
          }
        }
      }catch{}
    });
  }catch(e){ console.log('Bot start error:', e.message); status='DISCONNECTED'; }
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 ONLINE FILE Running on ${PORT} - ${status}`));