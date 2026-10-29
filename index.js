import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath, pathToFileURL } from 'node:url';
import baileys from '@whiskeysockets/baileys';
import { config } from './config.js';

const makeWASocket = baileys.default || baileys.makeWASocket;
const { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } = baileys;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_DIR = path.resolve(__dirname, './auth');
const logger = pino({ level: 'silent' });

let sock=null,status='DISCONNECTED',pairCode=null,pairTime=0,lastNumber='';
let commandsMap = new Map(); // Cache for commands

app.use(express.urlencoded({extended:true})); 
app.use(express.json());

function cleanAuth(){
  try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{}
  try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{}
}
function normNum(v){
  let n=String(v||'').replace(/\D/g,'');
  if(n.startsWith('0'))n='92'+n.slice(1);
  return n;
}
function getConfigDP(){
  try{
    const keys=['botImage','botPic','thumbnail','menuImage','ownerPic','logo'];
    for(const k of keys){ if(config[k] && String(config[k]).startsWith('http')) return config[k]; }
    for(const v of Object.values(config)){ if(typeof v==='string' && v.startsWith('http')) return v; }
  }catch{} return "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg";
}
function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP=getConfigDP();
  return`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA FURQAN MD</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px}.c{width:100%;max-width:420px;background:#111;border:2px solid #f00;border-radius:22px;padding:25px;text-align:center}.dp{width:120px;height:120px;border-radius:50%;border:3px solid #f00;object-fit:cover}.st{padding:7px 16px;border-radius:20px;font-weight:bold;display:inline-block;margin:10px}.CONNECTED{background:#0f0;color:#000}.CONNECTING{background:#ff0;color:#000}.DISCONNECTED{background:#f00}.code{margin-top:18px;background:#000;border:2px dashed #0f0;border-radius:15px;padding:16px}.code h1{font-family:monospace;font-size:34px;letter-spacing:5px;color:#0f0}</style></head><body><div class="c"><img class="dp" src="${DP}"><h2>RANA FURQAN MD</h2><p style="color:#ff0040">🌹 Powered by Meri JAAN 🌹</p><div class="st ${status}">${status}</div>${status==='CONNECTED'?`<div style="color:#0f0"><h3>✅ BOT ONLINE</h3><p>Ping Menu Working Now!</p></div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923003719761" required><button>GET CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1></div>`:''}`}</div></body></html>`
}
app.get('/',(req,res)=>res.send(html()));

// COMMANDS LOADER - RECURSIVE & FIXED
function loadAllCommands(){
  commandsMap.clear();
  const dir = path.join(__dirname,'commands');
  if(!fs.existsSync(dir)){
    console.log("❌ commands folder not found at", dir);
    return;
  }
  function scanFolder(folder){
    const items = fs.readdirSync(folder);
    for(const item of items){
      const full = path.join(folder, item);
      const stat = fs.statSync(full);
      if(stat.isDirectory()){
        scanFolder(full);
      } else if(item.toLowerCase().endsWith('.js')){
        const name = path.basename(item, '.js').toLowerCase();
        commandsMap.set(name, full);
      }
    }
  }
  scanFolder(dir);
  console.log(`✅ Loaded ${commandsMap.size} commands:`, [...commandsMap.keys()].join(', '));
}
loadAllCommands();

async function handleCoreCommands(cmd, wa, m, args){
  const jid = m.key.remoteJid;
  const DP = getConfigDP();
  
  if(cmd==='ping' || cmd==='p'){
    const start = Date.now();
    await wa.sendMessage(jid, { text: `*Pong!*\n\n⚡ Speed: ${Date.now()-start}ms\n✅ Bot Active\n\n🌹 Powered by Meri JAAN` }, { quoted: m });
    return true;
  }
  if(cmd==='alive' || cmd==='bot' || cmd==='test'){
    await wa.sendMessage(jid, { image:{url:DP}, caption: `*✅ RANA FURQAN MD ALIVE!*\n\n🤖 Status: ONLINE\n⚡ Prefix: .\n👑 Owner: RANA FURQAN\n\n🌹 Powered by Meri JAAN` }, { quoted: m });
    return true;
  }
  if(cmd==='menu' || cmd==='help' || cmd==='list'){
    let list = [...commandsMap.keys()].slice(0,100).join(', ');
    await wa.sendMessage(jid, { 
      image:{url:DP},
      caption: `*╭─🌹 RANA FURQAN MD MENU 🌹─╮*\n\n*Core:*\n.ping - Bot speed\n.alive - Bot status\n.menu - This list\n\n*All Commands (${commandsMap.size}):*\n${list}\n\n*🌹 Powered by Meri JAAN*\n╰─────────────────╯`
    }, { quoted: m });
    return true;
  }
  return false;
}

async function UNIVERSAL_RUN(cmdName, wa, m, args, prefix){
  if(await handleCoreCommands(cmdName, wa, m, args)) return true;
  
  const key = cmdName.toLowerCase();
  if(!commandsMap.has(key)) return false;
  
  const fullPath = commandsMap.get(key);
  try{
    // FIXED IMPORT - use pathToFileURL
    const fileUrl = pathToFileURL(fullPath).href + `?update=${Date.now()}`;
    const mod = await import(fileUrl);
    const handler = mod.default || mod;

    // Try all possible export patterns
    if(handler?.execute){
      await handler.execute(wa, m, args, { prefix, config, conn: wa, sock: wa });
      return true;
    }
    if(typeof handler === 'function'){
      await handler(wa, m, args, { conn: wa, prefix, config, sock: wa });
      return true;
    }
    if(handler?.handler){
      await handler.handler(m,{conn:wa,args,prefix,config,sock:wa});
      return true;
    }
    if(handler?.run){
      await handler.run(wa,m,args, { prefix, config });
      return true;
    }
    // For commands that export { command, execute } etc
    for(const val of Object.values(handler)){
      if(typeof val === 'function'){
        try{ await val(wa,m,args,{conn:wa,prefix,config}); return true; }catch{}
      }
    }

  }catch(e){
    console.log(`❌ ${cmdName} Error:`, e.message, e.stack);
    await wa.sendMessage(m.key.remoteJid, { text: `❌ .${cmdName} Error: ${e.message}` }, { quoted: m });
    return true;
  }
  return false;
}

async function startBot(num){
  try{
    if(num){lastNumber=num;cleanAuth();}
    if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
    const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();
    const wa = makeWASocket({
      version, logger, printQRInTerminal:false,
      auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,logger)},
      browser:['Ubuntu','Chrome','20.0.04'],
      markOnlineOnConnect:false,
      syncFullHistory:false,
      getMessage: async () => undefined
    });
    sock=wa; status='CONNECTING';
    wa.ev.on('creds.update', saveCreds);
    wa.ev.on('messages.upsert', async (upsert)=>{
      try{
        if(!upsert.messages||upsert.messages.length===0) return;
        const m=upsert.messages[0];
        if(!m.message) return;
        if(m.key.remoteJid==='status@broadcast') return;
        
        // FIXED MESSAGE EXTRACT - ephemeral + viewOnce support
        let text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
        // ephemeral
        if(!text) text = m.message.ephemeralMessage?.message?.extendedTextMessage?.text || "";
        if(!text) return;

        console.log(`📩 ${text} | From: ${m.key.remoteJid}`);
        const prefix=config.prefix||".";
        if(!text.startsWith(prefix)) return;
        const parts=text.slice(prefix.length).trim().split(/ +/);
        const cmd=parts.shift().toLowerCase();
        const args=parts;
        if(!cmd) return;
        console.log(`\n========== CMD: .${cmd} ==========`);
        const done = await UNIVERSAL_RUN(cmd, wa, m, args, prefix);
        if(!done){
          console.log(`❌ No handler for .${cmd}`);
          await wa.sendMessage(m.key.remoteJid, { text: `❌ Command .${cmd} not found\nType .menu` }, { quoted: m });
        }
      }catch(e){console.log("upsert error:", e.message)}
    });
    wa.ev.on('connection.update',async (u)=>{
      const {connection,lastDisconnect}=u;
      if(connection==='open'){
        status='CONNECTED';pairCode=null;
        console.log("✅ CONNECTED - READY TO REPLY");
        loadAllCommands(); // Reload on connect
        setTimeout(async ()=>{
          try{
            await wa.sendMessage(wa.user.id, { text: `✅ *BOT CONNECTED!*\n\nTotal Commands: ${commandsMap.size}\nAb koi bhi command try karo!\n\n🌹 Powered by Meri JAAN` });
          }catch(e){}
        },2000);
      }
      else if(connection==='close'){
        status='DISCONNECTED';sock=null;
        if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000);
      }
      else if(connection==='connecting') status='CONNECTING';
    });
    if(num){
      await new Promise(r=>setTimeout(r,3500));
      try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){console.log("pair err",e.message);}
    }
  }catch(e){status='DISCONNECTED';console.log("start err",e)}
}
app.post('/pair', async (req,res)=>{
  const n=normNum(req.body?.num);if(!n||n.length<11)return res.send('Invalid <a href="/">Back</a>');
  lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n);
  for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/');
}); 
app.listen(PORT,()=>console.log('Running '+PORT+' - FIXED VERSION 🌹'));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();