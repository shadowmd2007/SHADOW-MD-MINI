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
let pairingData = { code: null, expiry: 0 };
let currentPairSock = null;
let pairAttempts = 0;

app.use(express.json());

app.get('/', (req, res) => {
  if(pairingData.code && Date.now() > pairingData.expiry) pairingData.code = null;
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
button{width:100%;padding:14px;border-radius:12px;border:none;background:red;color:#fff;font-weight:bold;font-size:16px;cursor:pointer}
.code{font-size:34px;letter-spacing:4px;color:#00ff00;background:#000;padding:14px;border-radius:12px;margin-top:15px;border:2px dashed #0f0;font-weight:bold}
.small{color:yellow;font-size:11px;margin-top:8px}
</style>
</head>
<body>
<div class="card">
<img class="dp" src="${config.botImage}" />
<h1>🌹 ${config.botName} 🌹</h1>
<p style="font-size:12px;color:#aaa">STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'#fa0'}">${status}</b></p>
${status==='CONNECTED'?'<h2 style="color:#0f0">✅ CONNECTED 🌹</h2><p>.menu likho</p>':`
<form method="GET" action="/getcode">
<input name="number" type="text" value="${config.ownerNumber}" placeholder="92300XXXXXXX" required />
<button type="submit">GET CODE - FAST!</button>
</form>
${pairingData.code?`<div class="code">${pairingData.code}</div><div class="small">⏰ 10 SEC ME WHATSAPP ME DALO!<br>Linked Devices > Link with phone number</div>`:'<div class="small" style="color:#888">Code lo aur turant dalo</div>'}
`}
</div>
</body>
</html>
`);
});

async function createPairSocket(tempAuthFolder, num, isRestart=false){
  const { state, saveCreds } = await useMultiFileAuthState(tempAuthFolder);
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🌹 WA Version: ${version.join('.')} ${isRestart?'(RESTART after 515)':''}`);

  const tempSock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false,
    logger: pino({level:'silent'}),
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  });
  
  currentPairSock = tempSock;
  tempSock.ev.on('creds.update', saveCreds);

  await delay(2500);

  // Agar pehli baar hai to code mango, restart pe nahi
  if(!isRestart){
    console.log(`🌹 Requesting code for ${num}...`);
    try{
      let rawCode = await tempSock.requestPairingCode(num);
      let prettyCode = rawCode.includes('-') ? rawCode : `${rawCode.slice(0,4)}-${rawCode.slice(4)}`;
      pairingData = {
        code: prettyCode,
        raw: rawCode,
        expiry: Date.now() + 180000,
        tempFolder: tempAuthFolder,
      };
      console.log(`🌹🌹🌹 CODE GENERATED: ${prettyCode} - ENTER IN 10 SEC! 🌹🌹🌹`);
    }catch(e){
      console.log('Request code error:', e.message);
      pairingData.code = 'ERROR: '+e.message;
      return;
    }
  } else {
    console.log(`🌹 Socket restarted, waiting for user to enter previous code ${pairingData.code}...`);
  }

  tempSock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if(connection) console.log(`Connection update: ${connection}`);
    else console.log('Connection update: undefined (normal, waiting for code)');

    if(connection === 'open'){
      console.log('🌹🌹🌹 PAIR SUCCESSFUL - COPYING CREDS 🌹🌹🌹');
      try{
        const mainAuth = config.authDir;
        if(fs.existsSync(mainAuth)) fs.rmSync(mainAuth, {recursive:true, force:true});
        fs.mkdirSync(mainAuth, {recursive:true});
        for(let f of fs.readdirSync(tempAuthFolder)){
          const src = join(tempAuthFolder, f);
          if(fs.lstatSync(src).isFile()) fs.copyFileSync(src, join(mainAuth, f));
        }
        console.log('✅ Creds copied!');
        status = 'CONNECTED';
        pairingData.code = null;
        setTimeout(()=> startBot(), 1500);
      }catch(e){ console.log('Copy error:', e.message); }
    }
    
    if(connection === 'close'){
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const reason = lastDisconnect?.error?.message || '';
      console.log(`Temp connection closed, code: ${statusCode}, reason: ${reason}`);

      // 515 = Stream Errored (restart required) - YE NORMAL HAI, RESTART KARO
      if(statusCode === 515 || reason.includes('restart required') || reason.includes('Stream Errored')){
        console.log('🌹 515 detected - Restarting socket with same creds...');
        pairAttempts++;
        if(pairAttempts < 3){
          setTimeout(()=> createPairSocket(tempAuthFolder, num, true), 2000);
        } else {
          console.log('Too many 515 restarts, please get new code');
          pairingData.code = null;
        }
      }
      // 408 = Timeout - user ne code nahi dala
      else if(statusCode === 408){
        console.log('Timeout - user did not enter code in time');
      }
    }
  });
}

app.get('/getcode', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '').trim();
  if(!num) return res.redirect('/');
  try{ if(currentPairSock){ currentPairSock.end(); } }catch{}
  pairAttempts = 0;
  console.log(`🌹 Pair request for ${num} - PREPARE FAST ENTRY!`);
  try{
    const tempAuthFolder = join(__dirname, 'auth_info_temp');
    if(fs.existsSync(tempAuthFolder)) fs.rmSync(tempAuthFolder, {recursive:true, force:true});
    fs.mkdirSync(tempAuthFolder, {recursive:true});
    createPairSocket(tempAuthFolder, num, false);
  }catch(e){
    console.log('PAIR ERROR:', e.message);
    pairingData.code = 'ERROR: '+e.message;
  }
  res.redirect('/');
});

async function startBot(){
  if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){ status='DISCONNECTED'; return; }
  console.log('Starting main bot...');
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
    printQRInTerminal: false,
    logger: pino({level:'silent'}),
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: true,
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    if(u.connection==='open'){
      status='CONNECTED';
      console.log('🌹🌹🌹 RANA FURQAN MD CONNECTED 🌹🌹🌹');
      try{ await sock.sendMessage(config.ownerNumber+'@s.whatsapp.net',{image:{url:config.botImage},caption:`🌹 *${config.botName} CONNECTED!* 🌹`}); }catch{}
    }
    if(u.connection==='close'){
      const r = u.lastDisconnect?.error?.output?.statusCode;
      console.log('Main bot closed, reason:', r);
      if(r !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
      else { status='DISCONNECTED'; if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true}); }
    }
  });
  const pluginsPath = join(__dirname, 'plugins');
  let plugins = new Map();
  if(fs.existsSync(pluginsPath)){
    for(let f of fs.readdirSync(pluginsPath).filter(x=>x.endsWith('.js'))){
      try{ const m = await import(`file://${join(pluginsPath,f)}?update=${Date.now()}`); plugins.set(f, m.default||m); }catch{}
    }
  }
  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return;
      const body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
      if(!body.startsWith(config.prefix)) return;
      const args=body.slice(config.prefix.length).trim().split(/ +/); const cmd=args.shift().toLowerCase();
      for(let [k,p] of plugins){ try{ if(p.command&&p.command.includes(cmd)){ await (p.default?p.default(sock,msg,args,{config}):p(sock,msg,args,{config})); } }catch{} }
    }catch{}
  });
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 Running 515-FIXED on ${PORT}`));