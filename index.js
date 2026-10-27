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
.code{font-size:34px;letter-spacing:4px;color:#00ff00;background:#000;padding:14px;border-radius:12px;margin-top:15px;border:2px dashed #0f0;font-weight:bold;animation:blink 1s infinite}
@keyframes blink{50%{opacity:0.7}}
.small{color:yellow;font-size:11px;margin-top:8px}
</style>
</head>
<body>
<div class="card">
<img class="dp" src="${config.botImage}" />
<h1>🌹 ${config.botName} 🌹</h1>
<p style="font-size:12px;color:#aaa">STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'#fa0'}">${status}</b></p>
${status==='CONNECTED'?'<h2 style="color:#0f0">✅ CONNECTED 🌹</h2><p>.menu likho WhatsApp pe</p>':`
<form method="GET" action="/getcode">
<input name="number" type="text" value="${config.ownerNumber}" placeholder="92300XXXXXXX" required />
<button type="submit">GET CODE - FAST DALO!</button>
</form>
${pairingData.code?`<div class="code">${pairingData.code}</div><div class="small">⏰ 15 SEC KE ANDAR WHATSAPP ME DALO!<br>WhatsApp > Linked Devices > Link with phone number<br><br>Logs me CODE GENERATED ke 15 sec me dalo warna socket band!</div>`:'<div class="small" style="color:#888;margin-top:10px">Code leke TURANT WhatsApp me dalo</div>'}
`}
</div>
</body>
</html>
`);
});

app.get('/getcode', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '').trim();
  if(!num) return res.redirect('/');
  
  // Purana socket band karo
  try{ if(currentPairSock){ currentPairSock.end(); } }catch{}
  
  console.log(`🌹 Pair request for ${num} - PREPARE FAST ENTRY!`);
  
  try{
    const tempAuthFolder = join(__dirname, 'auth_info_temp');
    if(fs.existsSync(tempAuthFolder)) fs.rmSync(tempAuthFolder, {recursive:true, force:true});
    fs.mkdirSync(tempAuthFolder, {recursive:true});

    const { state, saveCreds } = await useMultiFileAuthState(tempAuthFolder);
    const { version } = await fetchLatestBaileysVersion();
    console.log(`🌹 WA Version: ${version.join('.')}`);

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

    if(tempSock.authState.creds.registered){
      console.log('Already registered in temp');
      pairingData.code = 'ALREADY LINKED';
      return res.redirect('/');
    }

    console.log(`🌹 Requesting code for ${num}...`);
    let rawCode = await tempSock.requestPairingCode(num);
    let prettyCode = rawCode.includes('-') ? rawCode : `${rawCode.slice(0,4)}-${rawCode.slice(4)}`;
    
    pairingData = {
      code: prettyCode,
      raw: rawCode,
      expiry: Date.now() + 180000, // 3 min
      tempFolder: tempAuthFolder,
    };

    console.log(`🌹🌹🌹 CODE GENERATED: ${prettyCode} for ${num} - ENTER IN 15 SEC! 🌹🌹🌹`);

    tempSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      if(connection) console.log(`Connection update: ${connection}`);
      else console.log('Connection update: undefined (normal)');

      if(connection === 'open'){
        console.log('🌹🌹🌹 PAIR SUCCESSFUL - COPYING TO MAIN AUTH 🌹🌹🌹');
        try{
          const mainAuth = config.authDir;
          if(fs.existsSync(mainAuth)) fs.rmSync(mainAuth, {recursive:true, force:true});
          fs.mkdirSync(mainAuth, {recursive:true});
          const files = fs.readdirSync(tempAuthFolder);
          for(let f of files){
            const src = join(tempAuthFolder, f);
            if(fs.lstatSync(src).isFile()) fs.copyFileSync(src, join(mainAuth, f));
          }
          console.log('✅ Creds copied, starting bot...');
          status = 'CONNECTED';
          pairingData.code = null;
          setTimeout(()=> startBot(), 1500);
        }catch(e){ console.log('Copy error:', e.message); }
      }
      
      if(connection === 'close'){
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log(`Temp connection closed, code: ${code}, reason: ${lastDisconnect?.error?.message}`);
        if(code === 408){
          console.log('Timeout - user did not enter code fast enough');
        }
      }
    });

    // 3 min tak khula rakho
    setTimeout(()=>{
      try{ 
        console.log('Temp sock ended after 3 min timeout');
        tempSock.end(); 
      }catch{}
    }, 180000);

  }catch(e){
    console.log('PAIR ERROR:', e.message, e.stack);
    pairingData.code = 'ERROR: '+e.message;
  }
  
  res.redirect('/');
});

async function startBot(){
  if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){
    status='DISCONNECTED'; return;
  }
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
      console.log('🌹🌹🌹 RANA FURQAN MD FULLY CONNECTED 🌹🌹🌹');
      try{
        await sock.sendMessage(config.ownerNumber+'@s.whatsapp.net',{image:{url:config.botImage},caption:`🌹 *${config.botName} CONNECTED!* 🌹\n\n✅ Bot Online Bhai JAAN!`});
      }catch{}
    }
    if(u.connection==='close'){
      const reason = u.lastDisconnect?.error?.output?.statusCode;
      console.log('Main bot closed, reason:', reason);
      if(reason !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
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
app.listen(PORT, ()=> console.log(`🌹 Running FIXED 3min socket on ${PORT}`));