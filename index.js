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
let isPairing = false;

app.use(express.json());

app.get('/', (req, res) => {
  if(pairCode && Date.now() > pairExpiry) pairCode = null;
  res.send(`
<!DOCTYPE html>
<html>
<head><title>🌹 ${config.botName} 🌹</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#0f0f0f;border:2px solid #ff0000;border-radius:25px;padding:25px;width:360px;text-align:center;box-shadow:0 0 30px red}
.dp{width:110px;height:110px;border-radius:50%;border:3px solid red;margin:0 auto 12px;display:block;object-fit:cover}
h1{color:red;margin:5px 0}
input{width:100%;padding:14px;border-radius:12px;border:none;margin:12px 0;text-align:center;font-size:17px;background:#222;color:#fff}
button{width:100%;padding:14px;border-radius:12px;border:none;background:red;color:#fff;font-weight:bold;font-size:16px;cursor:pointer}
.code{font-size:36px;letter-spacing:5px;color:#00ff00;background:#000;padding:15px;border-radius:12px;margin-top:15px;border:3px dashed #0f0;font-weight:bold}
</style>
</head>
<body>
<div class="card">
<img class="dp" src="${config.botImage}" onerror="this.src='https://i.ibb.co/BHfCmfbw/jawadmd.jpg'" />
<h1>🌹 ${config.botName} 🌹</h1>
<p style="font-size:12px;color:#aaa">STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'orange'}">${status}</b></p>
${status==='CONNECTED'?'<h2 style="color:#0f0">✅ CONNECTED 🌹<br>.menu likho</h2>':`
<form action="/getcode" method="GET">
<input name="number" value="${config.ownerNumber}" placeholder="92300XXXXXXX" required />
<button type="submit">GET PAIR CODE</button>
</form>
${pairCode?`<div class="code">${pairCode}</div><div style="color:yellow;font-size:12px;margin-top:10px">👇 WhatsApp pe foran dalo:<br><b>Linked Devices > Link with phone number</b><br>15 sec me dalo warna expire!</div>`:'<div style="color:#666;font-size:11px;margin-top:10px">Code leke turant dalo</div>'}
`}
</div>
</body>
</html>
`);
});

let mainSock = null;

async function startPairing(num){
  if(isPairing) return;
  isPairing = true;
  pairCode = null;
  
  try{
    // Main auth folder hi use karo - temp nahi
    const authDir = config.authDir;
    // Agar pehle se connected hai to usko band karo
    if(fs.existsSync(authDir)){
      console.log('Cleaning old auth for fresh pairing...');
      // Purana auth delete mat karo, same me hi pair karo - warna 515 zyada ayega
    } else {
      fs.mkdirSync(authDir, {recursive:true});
    }

    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`🌹 WA v${version.join('.')} Pairing for ${num}`);

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))
      },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Ubuntu','Chrome','20.0.04'],
    });

    sock.ev.on('creds.update', saveCreds);

    await delay(3000);

    if(!sock.authState.creds.registered){
      console.log(`🌹 Requesting pair code for ${num}...`);
      let code = await sock.requestPairingCode(num);
      code = code.includes('-') ? code : code.slice(0,4)+'-'+code.slice(4);
      pairCode = code;
      pairExpiry = Date.now() + 120000;
      console.log(`🌹🌹🌹 CODE: ${code} - ENTER NOW! 🌹🌹🌹`);
    } else {
      console.log('Already registered!');
      status = 'CONNECTED';
      startBot();
      isPairing = false;
      return;
    }

    sock.ev.on('connection.update', async (u)=>{
      const { connection, lastDisconnect } = u;
      console.log('Pair connection:', connection || 'undefined');

      if(connection === 'open'){
        console.log('🌹🌹🌹 PAIR SUCCESSFUL - CONNECTED 🌹🌹🌹');
        status = 'CONNECTED';
        pairCode = null;
        isPairing = false;
        // Bot start karo
        setTimeout(()=> startBot(), 1000);
      }

      if(connection === 'close'){
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log(`Pair closed, code: ${code}`);
        // 515 = restart required - ye normal hai, dobara start karo same auth se
        if(code === 515 || code === 408){
          console.log('Restarting after 515/408...');
          setTimeout(()=>{
            isPairing = false;
            startBot();
          }, 2000);
        } else if(code !== DisconnectReason.loggedOut){
          isPairing = false;
        }
      }
    });

  }catch(e){
    console.log('Pair error:', e.message);
    pairCode = 'ERROR: '+e.message;
    isPairing = false;
  }
}

app.get('/getcode', async (req,res)=>{
  let num = (req.query.number || '').replace(/[^0-9]/g,'').trim();
  if(!num) return res.redirect('/');
  console.log(`Pair request: ${num}`);
  startPairing(num);
  // Thoda wait karke redirect taaki code generate ho jaye
  setTimeout(()=> res.redirect('/'), 4000);
});

async function startBot(){
  if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){
    status='DISCONNECTED';
    console.log('No auth yet');
    return;
  }
  console.log('Starting main bot...');
  try{
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const sock = makeWASocket({
      version: (await fetchLatestBaileysVersion()).version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Ubuntu','Chrome','20.0.04'],
      markOnlineOnConnect: true,
    });
    mainSock = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u)=>{
      const { connection, lastDisconnect } = u;
      if(connection==='open'){
        status='CONNECTED';
        console.log('🌹🌹🌹 RANA FURQAN MD FULLY CONNECTED - PAIR SUCCESS 🌹🌹🌹');
        try{
          await sock.sendMessage(config.ownerNumber+'@s.whatsapp.net',{text:`🌹 *${config.botName} CONNECTED!* 🌹\n\n✅ Pair Successfully Ho Gaya Bhai JAAN!\n\n.menu likho`});
        }catch{}
      }
      if(connection==='close'){
        const reason = lastDisconnect?.error?.output?.statusCode;
        console.log('Main bot closed:', reason);
        if(reason !== DisconnectReason.loggedOut){
          setTimeout(startBot, 3000);
        } else {
          status='DISCONNECTED';
        }
      }
    });

    const pluginsPath = join(__dirname, 'plugins');
    let plugins = new Map();
    if(fs.existsSync(pluginsPath)){
      for(let f of fs.readdirSync(pluginsPath).filter(x=>x.endsWith('.js'))){
        try{ const m = await import(`file://${join(pluginsPath,f)}?update=${Date.now()}`); plugins.set(f, m.default||m); }catch(e){ console.log(e.message) }
      }
    }
    console.log(`Loaded ${plugins.size} plugins`);
    sock.ev.on('messages.upsert', async (m)=>{
      try{
        const msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return;
        const body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
        if(!body.startsWith(config.prefix)) return;
        const args=body.slice(config.prefix.length).trim().split(/ +/); const cmd=args.shift().toLowerCase();
        for(let [k,p] of plugins){ try{ if(p.command&&p.command.includes(cmd)){ await (p.default?p.default(sock,msg,args,{config}):p(sock,msg,args,{config})); } }catch{} }
      }catch{}
    });

  }catch(e){ console.log('Bot start error:', e.message); status='DISCONNECTED'; }
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 FINAL CHECKED BOT Running on ${PORT}`));