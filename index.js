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
let sock = null;

app.use(express.json());

// 🌹 MAIN PAGE - LOGO YAHI RAHEGA
app.get('/', (req, res) => {
  const codeExpired = pairingData.code && Date.now() > pairingData.expiry;
  if(codeExpired) pairingData.code = null;
  
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
<img class="dp" src="${config.botImage}" onerror="this.src='https://i.ibb.co/BHfCmfbw/jawadmd.jpg'" />
<h1>🌹 ${config.botName} 🌹</h1>
<p style="font-size:12px;color:#aaa">OWNER: ${config.ownerNumber} | STATUS: <b style="color:${status==='CONNECTED'?'#0f0':'#fa0'}">${status}</b></p>
${status === 'CONNECTED' ? '<h2 style="color:#0f0">✅ CONNECTED 🌹<br>.menu likho</h2><a href="/logout"><button style="background:#333">LOGOUT</button></a>' : `
<form method="GET" action="/getcode">
<input name="number" type="text" value="${config.ownerNumber}" placeholder="92300XXXXXXX" required />
<button type="submit">GET PAIR CODE</button>
</form>
${pairingData.code ? `<div class="code">${pairingData.code}</div><div class="small">Code sahi likho - 60 sec valid hai<br>WhatsApp > Linked Devices > Link with phone number</div>` : '<div class="small" style="margin-top:12px;color:#888">Number dal ke GET PAIR CODE dabao</div>'}
<p style="font-size:10px;color:#666;margin-top:15px">Agar 1 number pe na ho to dusra try karo,<br>lekin 2 min ruk ke naya code lo</p>
`}
</div>
</body>
</html>
`);
});

// 🌹 FIXED PAIR CODE LOGIC - YAHI ASLI FIX HAI
app.get('/getcode', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '').trim();
  if(!num) return res.redirect('/');
  
  console.log(`🌹 Pair request for ${num}`);
  
  try{
    // 1. Purana auth temp folder delete karo
    const tempAuthFolder = join(__dirname, 'auth_info_temp');
    if(fs.existsSync(tempAuthFolder)){
      fs.rmSync(tempAuthFolder, {recursive:true, force:true});
    }
    fs.mkdirSync(tempAuthFolder, {recursive:true});

    // 2. Fresh auth state banao
    const { state, saveCreds } = await useMultiFileAuthState(tempAuthFolder);
    const { version } = await fetchLatestBaileysVersion();
    
    console.log(`🌹 WA Version: ${version.join('.')}`);

    // 3. Socket banao - Bina cache ke simple
    const tempSock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Ubuntu', 'Chrome', '20.0.04'],
      syncFullHistory: false,
    });

    tempSock.ev.on('creds.update', saveCreds);

    // 4. Wait karo socket ready hone tak
    await delay(3500);

    // 5. Check karo registered hai ya nahi
    if(tempSock.authState.creds.registered){
      console.log('Already registered');
      try{ tempSock.end(); }catch{}
      pairingData.code = 'ALREADY LINKED';
      return res.redirect('/');
    }

    // 6. Pairing code mango
    console.log(`Requesting code for ${num}...`);
    let rawCode = await tempSock.requestPairingCode(num);
    let prettyCode = rawCode.includes('-') ? rawCode : `${rawCode.slice(0,4)}-${rawCode.slice(4)}`;
    
    pairingData = {
      code: prettyCode,
      raw: rawCode,
      expiry: Date.now() + 90000, // 90 sec
      tempFolder: tempAuthFolder,
      sock: tempSock
    };

    console.log(`🌹 CODE GENERATED: ${prettyCode} (raw: ${rawCode}) for ${num}`);

    // 7. Jab user code dale to main auth me copy karo
    tempSock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;
      console.log('Connection update:', connection);
      
      if(connection === 'open'){
        console.log('🌹🌹🌹 PAIR SUCCESSFUL - COPYING CREDS 🌹🌹🌹');
        try{
          const mainAuth = config.authDir;
          if(fs.existsSync(mainAuth)) fs.rmSync(mainAuth, {recursive:true, force:true});
          fs.mkdirSync(mainAuth, {recursive:true});
          
          // Saari files copy karo
          const files = fs.readdirSync(tempAuthFolder);
          for(let f of files){
            const src = join(tempAuthFolder, f);
            const dest = join(mainAuth, f);
            if(fs.lstatSync(src).isFile()){
              fs.copyFileSync(src, dest);
            }
          }
          console.log('Creds copied to main auth');
          status = 'CONNECTED';
          pairingData.code = null;
          
          // Main bot start karo
          setTimeout(()=> startBot(), 1000);
        }catch(e){
          console.log('Copy error:', e.message);
        }
      }
      if(connection === 'close'){
        console.log('Temp connection closed');
      }
    });

    // 8. 90 sec baad socket band karo
    setTimeout(()=>{
      try{ 
        if(pairingData.sock) pairingData.sock.end(); 
        console.log('Temp sock ended after timeout');
      }catch{}
    }, 90000);

  }catch(e){
    console.log('PAIR ERROR FULL:', e);
    pairingData.code = 'ERROR - Check Logs';
  }
  
  res.redirect('/');
});

app.get('/logout', (req,res)=>{
  try{
    if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
    status='DISCONNECTED';
    console.log('Logged out, auth deleted');
  }catch{}
  res.redirect('/');
});

// BOT START - LOGO SAME RAHEGA
async function startBot(){
  if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){
    status='DISCONNECTED'; console.log('No auth, waiting for pair'); return;
  }
  console.log('Starting bot with existing auth...');
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
    printQRInTerminal: false,
    logger: pino({level:'silent'}),
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: true,
    syncFullHistory: false,
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    const { connection, lastDisconnect } = u;
    if(connection==='open'){
      status='CONNECTED';
      console.log('🌹 RANA FURQAN MD FULLY CONNECTED 🌹');
      try{
        await sock.sendMessage(config.ownerNumber+'@s.whatsapp.net',{
          image:{url:config.botImage},
          caption:`🌹 *${config.botName} CONNECTED!* 🌹\n\n✅ Bot Online Hai Bhai JAAN!\n📱 .menu likho\n\nOwner: ${config.ownerNumber}`
        });
      }catch(e){ console.log('Welcome msg error', e.message) }
    }
    if(connection==='close'){
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log('Bot connection closed, reason:', reason);
      if(reason !== DisconnectReason.loggedOut){
        console.log('Reconnecting in 3 sec...');
        setTimeout(startBot, 3000);
      } else {
        status='DISCONNECTED';
        if(fs.existsSync(config.authDir)) fs.rmSync(config.authDir,{recursive:true,force:true});
      }
    }
  });

  // Plugins load
  const pluginsPath = join(__dirname, 'plugins');
  let plugins = new Map();
  if(fs.existsSync(pluginsPath)){
    for(let file of fs.readdirSync(pluginsPath).filter(f=>f.endsWith('.js'))){
      try{
        const mod = await import(`file://${join(pluginsPath,file)}?update=${Date.now()}`);
        plugins.set(file, mod.default||mod);
      }catch(e){ console.log(`Plugin ${file} error:`, e.message) }
    }
    console.log(`Loaded ${plugins.size} plugins`);
  }

  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const msg=m.messages[0]; if(!msg.message||msg.key.fromMe) return;
      const body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||msg.message.videoMessage?.caption||'';
      if(!body.startsWith(config.prefix)) return;
      const args=body.slice(config.prefix.length).trim().split(/ +/);
      const command=args.shift().toLowerCase();
      for(let [name, plugin] of plugins){
        try{
          if(plugin.command && plugin.command.includes(command)){
            await (plugin.default ? plugin.default(sock, msg, args, {config}) : plugin(sock, msg, args, {config}));
          }
        }catch(e){ console.log(`Cmd ${command} error`, e.message) }
      }
    }catch(e){ console.log('Message error', e.message) }
  });
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 ${config.botName} Running on ${PORT} - FIXED PAIR LOGIC`));