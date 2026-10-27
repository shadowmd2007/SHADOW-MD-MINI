try { const d = await import('dotenv'); (d.default ?? d).config(); } catch {}
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
const PORT = process.env.PORT || config.port || 3000;

let status = 'DISCONNECTED';
let pairingData = { code: null, qr: null };
let sock = null;

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head><title>🌹 ${config.botName} 🌹</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#0f0f0f;border:2px solid #ff0000;border-radius:25px;padding:25px;width:360px;text-align:center;box-shadow:0 0 30px red}
.dp{width:110px;height:110px;border-radius:50%;border:3px solid red;margin:0 auto 12px;display:block;object-fit:cover;box-shadow:0 0 20px red}
h1{color:red;margin:5px 0;font-size:22px}
input{width:100%;padding:14px;border-radius:12px;border:none;margin:12px 0;text-align:center;font-size:17px;background:#222;color:#fff}
button{width:100%;padding:14px;border-radius:12px;border:none;background:red;color:#fff;font-weight:bold;font-size:16px;cursor:pointer;margin-top:8px}
.code{font-size:32px;letter-spacing:4px;color:#00ff00;background:#000;padding:14px;border-radius:12px;margin-top:15px;border:2px dashed #0f0;font-weight:bold}
</style>
</head>
<body>
<div class="card">
<img class="dp" src="${config.botImage}" onerror="this.src='https://i.ibb.co/BHfCmfbw/jawadmd.jpg'" />
<h1>🌹 ${config.botName} 🌹</h1>
<p style="font-size:12px;color:#aaa">OWNER: ${config.ownerNumber} | STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'#fa0'}">${status}</b></p>
${status === 'CONNECTED' ? '<h2 style="color:#0f0">✅ BOT CONNECTED 🌹</h2>' : `
<form method="GET" action="/getcode">
<input name="number" value="${config.ownerNumber}" placeholder="92300XXXXXXX" required />
<button type="submit">GET PAIR CODE</button>
</form>
${pairingData.code ? `<div class="code">${pairingData.code}</div><div style="color:yellow;font-size:12px;margin-top:8px">Valid 90 sec - Waisa hi likho, X ko S mat likho!</div>` : ''}
`}
</div>
</body>
</html>
`);
});

app.get('/getcode', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '');
  if(!num) return res.redirect('/');
  try{
    const pairDir = join(__dirname, 'auth', `pair-${Date.now()}`);
    if(fs.existsSync(pairDir)) fs.rmSync(pairDir,{recursive:true,force:true});
    fs.mkdirSync(pairDir,{recursive:true});
    const { state, saveCreds } = await useMultiFileAuthState(pairDir);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`🌹 Using WA v${version.join('.')} for ${num}`);
    const tempSock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
      printQRInTerminal: true,
      logger: pino({level:'silent'}),
      browser: ['Chrome','Windows','10'],
    });
    tempSock.ev.on('creds.update', saveCreds);
    await delay(3000);
    if(!tempSock.authState.creds.registered){
      let code = await tempSock.requestPairingCode(num);
      let pretty = code.includes('-') ? code : code.slice(0,4)+'-'+code.slice(4);
      pairingData = { code: pretty, dir: pairDir, sock: tempSock };
      console.log(`🌹 CODE FOR ${num} => ${pretty} raw:${code}`);
      tempSock.ev.on('connection.update', async (u)=>{
        if(u.connection === 'open'){
          console.log('🌹 PAIR SUCCESS');
          try{
            const mainDir = config.authDir;
            if(fs.existsSync(mainDir)) fs.rmSync(mainDir,{recursive:true,force:true});
            fs.mkdirSync(mainDir,{recursive:true});
            for(let f of fs.readdirSync(pairDir)){ fs.copyFileSync(join(pairDir,f), join(mainDir,f)); }
            status='CONNECTED'; startBot();
          }catch(e){ console.log(e.message) }
        }
      });
      setTimeout(()=>{ try{tempSock.end()}catch{} }, 90000);
    }
  }catch(e){ console.log('Pair error', e.message); pairingData.code = 'ERROR: '+e.message; }
  res.redirect('/');
});

async function startBot(){
  if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){ status='DISCONNECTED'; return; }
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
    printQRInTerminal: false,
    logger: pino({level:'silent'}),
    browser: ['Chrome','Windows','10'],
    markOnlineOnConnect: true
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    if(u.connection==='open'){ status='CONNECTED'; console.log('🌹 RANA FURQAN MD CONNECTED 🌹'); try{ await sock.sendMessage(config.ownerNumber+'@s.whatsapp.net',{image:{url:config.botImage},caption:`🌹 *${config.botName} CONNECTED!* 🌹\n\n✅ Bot Online Hai Bhai JAAN!`}); }catch{} }
    if(u.connection==='close'){ let r=u.lastDisconnect?.error?.output?.statusCode; if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000); else status='DISCONNECTED'; }
  });
  const pluginsPath = join(__dirname, 'plugins');
  let plugins = new Map();
  if(fs.existsSync(pluginsPath)){
    for(let file of fs.readdirSync(pluginsPath).filter(f=>f.endsWith('.js'))){
      try{ const p = await import(`file://${join(pluginsPath,file)}?update=${Date.now()}`); plugins.set(file, p.default||p); }catch(e){ console.log(e.message) }
    }
  }
  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return;
      const body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
      if(!body.startsWith(config.prefix)) return;
      const args=body.slice(config.prefix.length).trim().split(/ +/); const cmd=args.shift().toLowerCase();
      for(let [n,p] of plugins){ try{ if(p.command&&p.command.includes(cmd)){ await p.default?p.default(sock,msg,args,{config}):p(sock,msg,args,{config}); } }catch(e){} }
    }catch{}
  });
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 ${config.botName} Running on ${PORT}`));