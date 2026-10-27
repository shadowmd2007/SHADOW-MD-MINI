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
let status = 'DISCONNECTED';

app.get('/', (req,res)=>{
  res.send(`<html><body style="background:#000;color:#fff;text-align:center;font-family:sans-serif"><div style="border:2px solid red;border-radius:20px;padding:20px;max-width:350px;margin:50px auto;background:#111">
  <img src="${config.botImage}" style="width:100px;height:100px;border-radius:50%;border:3px solid red"/>
  <h1>🌹 ${config.botName} 🌹</h1><h2 style="color:${status==='CONNECTED'?'#0f0':'red'}">${status}</h2>
  ${status==='CONNECTED'?`<h2 style="color:#0f0">✅ ONLINE WORKING ✅</h2><p>.menu likho</p>`:`
  <p style="color:yellow">Railway Variables me SESSION_ID dalo</p><p style="font-size:11px;color:#888">Pair Code ke liye: pair.erfan-md.site</p>`}
  </div></body></html>`);
});

async function initAuth(){
  if(!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir,{recursive:true});
  // ✅ ABHI KA METHOD: SESSION_ID se auth banta hai
  let sessionId = process.env.SESSION_ID || config.SESSION_ID;
  if(sessionId && sessionId.includes('~')){
    try{
      let parts = sessionId.split('~')[1] || sessionId;
      // Agar base64 hai to decode, agar nahi to direct creds
      if(parts.length > 50){
        let decoded = Buffer.from(parts, 'base64').toString();
        if(decoded.includes('creds')){
          fs.writeFileSync(join(config.authDir,'creds.json'), decoded);
        } else {
          fs.writeFileSync(join(config.authDir,'creds.json'), Buffer.from(parts, 'base64').toString());
        }
        console.log('🌹 SESSION_ID LOADED - WORKING METHOD 🌹');
      }
    }catch(e){ console.log('Session decode error:', e.message); }
  }
}

async function startBot(){
  await initAuth();
  if(!fs.existsSync(join(config.authDir,'creds.json'))){
    status='NEED SESSION_ID';
    console.log('❌ No SESSION_ID - Go to pair.erfan-md.site');
    return;
  }
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    browser: ['Ubuntu','Chrome','20.0.04'], // ✅ ABHI YAHI CHAL RAHA HAI
    markOnlineOnConnect: true,
    printQRInTerminal: false,
  });
  
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u)=>{
    if(u.connection==='open'){ status='CONNECTED'; console.log('🌹 RANA FURQAN MD ONLINE - WORKING 🌹'); }
    if(u.connection==='close'){
      let r=u.lastDisconnect?.error?.output?.statusCode;
      status='DISCONNECTED';
      if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000);
    }
  });

  // Load commands
  let plugins=new Map();
  for(let d of ['commands','plugins']){
    let p=join(__dirname,d);
    if(fs.existsSync(p)){
      for(let f of fs.readdirSync(p).filter(x=>x.endsWith('.js'))){
        try{ let m=await import(`file://${join(p,f)}?t=${Date.now()}`); let pl=m.default||m; if(pl.command) plugins.set(f,pl); }catch{}
      }
    }
  }
  console.log(`🌹 TOTAL: ${plugins.size} commands loaded - WORKING`);

  sock.ev.on('messages.upsert', async (m)=>{
    let msg=m.messages[0]; if(!msg?.message) return;
    let body=msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
    if(!body.startsWith(config.prefix)) return;
    let args=body.slice(config.prefix.length).trim().split(/ +/); let cmd=args.shift().toLowerCase();
    for(let pl of plugins.values()){ if(pl.command?.includes(cmd)) await pl(sock,msg,args,{config}); }
  });
}

startBot();
app.listen(PORT, ()=> console.log(`🌹 WORKING BOT Running ${PORT}`));