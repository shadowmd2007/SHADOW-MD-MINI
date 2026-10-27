import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
let status = 'DISCONNECTED';

app.get('/', (req,res)=>{
  res.send(`
  <html><head><title>RANA FURQAN MD</title><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}
  .card{background:#111;border:2px solid #ff0040;border-radius:20px;padding:20px;width:360px;text-align:center;box-shadow:0 0 20px #ff0040}
  .dp{width:110px;height:110px;border-radius:50%;border:4px solid #ff0040}
  h1{color:#ff0040}</style></head><body><div class="card">
  <img class="dp" src="${config.botImage}"/>
  <h1>🌹 RANA FURQAN MD 🌹</h1>
  <h2 style="color:${status==='CONNECTED'?'#0f0':'#ff0040'}">${status}</h2>
  ${status==='CONNECTED'?`<h3 style="color:#0f0">✅ BOT ONLINE ✅<br>WhatsApp pe .menu likho</h3>`:`<p style="color:yellow">Railway Variables me SESSION_ID dalo<br>Fir bot auto online ho jayega</p><p style="font-size:11px;color:#888">Termux se SESSION_ID lo - Railway pe Pair Code block hai</p>`}
  <p style="font-size:10px;color:#666;margin-top:15px">© RANA FURQAN MD - OFFICIAL - 2026</p>
  </div></body></html>`);
});

async function loadSession(){
  if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
  let sessionId = process.env.SESSION_ID || config.SESSION_ID || '';
  if(!sessionId){
    console.log('❌ NO SESSION_ID - Please add in Railway Variables');
    return false;
  }
  try{
    let credsData = null;
    if(sessionId.includes('RANA-FURQAN-MD~')){
      let b64 = sessionId.split('~')[1];
      credsData = Buffer.from(b64, 'base64').toString();
    } else if(sessionId.includes('~')){
      let b64 = sessionId.split('~')[1] || sessionId;
      try{ credsData = Buffer.from(b64, 'base64').toString(); }catch{ credsData = b64; }
    } else {
      try{ credsData = Buffer.from(sessionId, 'base64').toString(); }catch{ credsData = sessionId; }
    }
    if(credsData && credsData.includes('{')){
      fs.writeFileSync(join(config.authDir,'creds.json'), credsData);
      console.log('🌹 RANA FURQAN MD SESSION LOADED 🌹');
      return true;
    }
  }catch(e){ console.log('Session error:', e.message); }
  return false;
}

async function startBot(){
  let hasSession = await loadSession();
  if(!hasSession){
    status='NEED SESSION_ID';
    console.log('❌ RANA FURQAN MD - SESSION_ID chahiye');
    return;
  }
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();
  console.log(`🌹 RANA FURQAN MD Starting v${version}`);

  const sock = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    browser: ['RANA FURQAN MD','Chrome','20.0.04'],
    markOnlineOnConnect: true,
    printQRInTerminal: false,
    syncFullHistory: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (u)=>{
    const { connection, lastDisconnect } = u;
    if(connection==='open'){
      status='CONNECTED';
      console.log('🌹 RANA FURQAN MD ONLINE - OFFICIAL 🌹');
    }
    if(connection==='close'){
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log('Closed:', reason);
      status='DISCONNECTED';
      if(reason!==DisconnectReason.loggedOut){
        setTimeout(startBot, 3000);
      }
    }
  });

  // RANA FURQAN MD COMMANDS
  let plugins=new Map();
  for(let folder of ['commands','plugins']){
    let pPath=join(__dirname,folder);
    if(fs.existsSync(pPath)){
      let files=fs.readdirSync(pPath).filter(x=>x.endsWith('.js'));
      for(let f of files){
        try{
          let mod=await import(`file://${join(pPath,f)}?t=${Date.now()}`);
          let p=mod.default||mod;
          if(p.command) plugins.set(f,p);
        }catch(e){ console.log(`Plugin ${f} error`, e.message); }
      }
    }
  }
  console.log(`🌹 RANA FURQAN MD: ${plugins.size} PLUGINS LOADED`);

  sock.ev.on('messages.upsert', async (m)=>{
    let msg=m.messages[0];
    if(!msg?.message) return;
    let body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
    if(!body.startsWith(config.prefix)) return;
    let args=body.slice(config.prefix.length).trim().split(/ +/);
    let cmd=args.shift().toLowerCase();
    for(let pl of plugins.values()){
      if(pl.command?.includes(cmd)){
        try{ await pl(sock,msg,args,{config}); }catch(e){ console.log(e.message); }
      }
    }
  });
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 RANA FURQAN MD RUNNING ON ${PORT} - NO PAIRING, ONLY SESSION 🌹`));