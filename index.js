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
const ANTIDELETE_FILE = path.join(AUTH_DIR, 'antidelete.json');
const ONLINE_FILE = path.join(AUTH_DIR, 'online.json');
const logger = pino({ level: 'silent' });

let sock=null,status='DISCONNECTED',pairCode=null,pairTime=0,lastNumber='';
let messageStore = new Map();
let commandsMap = new Map();
let antiDeleteEnabled = false;
let alwaysOnline = true;
let onlineInterval = null;

try{ if(fs.existsSync(ANTIDELETE_FILE)) antiDeleteEnabled = JSON.parse(fs.readFileSync(ANTIDELETE_FILE,'utf8')).enabled; }catch{}
try{ if(fs.existsSync(ONLINE_FILE)) alwaysOnline = JSON.parse(fs.readFileSync(ONLINE_FILE,'utf8')).online; }catch{}

app.use(express.urlencoded({extended:true})); app.use(express.json());
function cleanAuth(){ try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{} try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{} }
function normNum(v){ let n=String(v||'').replace(/\D/g,''); if(n.startsWith('0'))n='92'+n.slice(1); return n; }
function getDP(){ if(config.menuImage?.startsWith('http')) return config.menuImage; if(config.botImage?.startsWith('http')) return config.botImage; return "https://i.ibb.co/BHfCmfbw/jawadmd.jpg"; }
function loadCommands(){ commandsMap.clear(); const dir=path.join(__dirname,'commands'); if(!fs.existsSync(dir)) return; const scan=(d)=>{ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); if(fs.statSync(p).isDirectory()) scan(p); else if(f.endsWith('.js')) commandsMap.set(f.replace('.js','').toLowerCase(),p);} }; scan(dir); console.log(`✅ ${commandsMap.size} cmds loaded`); }
loadCommands();
function saveAntiDelete(){ try{ fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify({enabled: antiDeleteEnabled})); }catch{} }
function saveOnline(){ try{ fs.writeFileSync(ONLINE_FILE, JSON.stringify({online: alwaysOnline})); }catch{} }

function setOnlinePresence(wa, online){
  try{
    if(onlineInterval) clearInterval(onlineInterval);
    if(online){
      wa.sendPresenceUpdate('available');
      onlineInterval = setInterval(()=>{ try{ wa.sendPresenceUpdate('available'); }catch{} }, 25000);
    } else {
      wa.sendPresenceUpdate('unavailable');
    }
  }catch{}
}

function html(){
  const valid=pairCode&&Date.now()-pairTime<65000; const DP=getDP();
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA MD</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;color:#fff;padding:20px;font-family:Arial}.card{width:100%;max-width:430px;background:#111;border:2px solid #ff0040;border-radius:28px;padding:28px;text-align:center}.dp{width:130px;height:130px;border-radius:50%;border:3px solid #ff0040;object-fit:cover}.status{padding:7px 18px;border-radius:20px;font-weight:700;display:inline-block;margin:10px 0}.CONNECTED{background:#0f0;color:#000}.DISCONNECTED{background:#f00}input,button{width:100%;padding:14px;margin-top:12px;border-radius:14px}input{background:#000;color:#fff;border:1px solid #333;text-align:center}button{background:#ff0040;color:#fff;border:none;font-weight:700}.online{margin-top:10px;padding:8px;border-radius:10px;background:#222;font-size:13px}</style></head><body><div class="card"><img class="dp" src="${DP}"><h1>RANA FURQAN MD</h1><div style="color:#ff4d6d">🌹 Meri JAAN 🌹</div><div class="status ${status}">${status}</div><div class="online">Online: ${alwaysOnline?'🟢 ON':'⚫ OFF'} | ${commandsMap.size} Cmds | Anti: ${antiDeleteEnabled?'ON':'OFF'}</div>${status==='CONNECTED'?`<div style="color:#0f0;margin-top:10px">✅ ONLINE</div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="92300..." required><button>GET CODE</button></form>${valid?`<h1 style="color:#0f0;letter-spacing:5px">${pairCode}</h1>`:''}`}</div></body></html>`;
}
app.get('/',(req,res)=>res.send(html()));

function getSender(m){ return (m.key.participant || m.key.remoteJid || "").replace(/@.*/,'').replace(/\D/g,''); }

// === FIXED OWNER CHECK - STRING YA ARRAY DONO CHALEGA ===
function getOwnerList(){
  let list = config.ownerNumber;
  if(!list) return [];
  if(typeof list === 'string') list = [list];
  if(!Array.isArray(list)) list = [String(list)];
  return list.map(n=> String(n).replace(/\D/g,'')).filter(Boolean);
}
function isOwner(m){
  const sender = getSender(m);
  const owners = getOwnerList();
  if(owners.length===0) return true;
  const shortSender = sender.slice(-10);
  return owners.some(o=> {
    const shortO = o.slice(-10);
    return sender.endsWith(shortO) || shortSender === shortO || o.includes(shortSender) || shortO.includes(shortSender);
  });
}

async function startBot(num){
  if(num){lastNumber=num;cleanAuth();}
  if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
  const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
  const {version} = await fetchLatestBaileysVersion();
  const wa = makeWASocket({ version, logger, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,logger)}, browser:['Ubuntu','Chrome','20.0.04'], getMessage: async (key) => messageStore.get(key.id) });
  sock=wa; status='CONNECTING';
  wa.ev.on('creds.update', saveCreds);
  
  wa.ev.on('messages.upsert', async (upsert)=>{
    try{
      for(const mm of upsert.messages){ if(mm?.message) messageStore.set(mm.key.id, mm); }
      const m = upsert.messages?.[0]; if(!m?.message) return;
      if(m.key.remoteJid==='status@broadcast') return;
      let text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""; 
      const jid=m.key.remoteJid; if(!text) return;
      if(!text.startsWith(config.prefix)) return;
      
      const args = text.slice(config.prefix.length).trim().split(/ +/); 
      const cmd = args.shift().toLowerCase(); if(!cmd) return;
      console.log(`CMD: .${cmd}`);

      // ONLINE ON/OFF
      if(cmd==='online' || cmd==='offline'){
        if(!isOwner(m)) return;
        const sub = args[0]?.toLowerCase();
        if(cmd==='online' && (!sub || sub==='on')){
          alwaysOnline = true; saveOnline(); setOnlinePresence(wa, true);
          await wa.sendMessage(jid,{text:`🟢 *ONLINE ON*\nHar time Online 🌹`},{quoted:m});
        } else if(cmd==='offline' || (cmd==='online' && sub==='off')){
          alwaysOnline = false; saveOnline(); setOnlinePresence(wa, false);
          await wa.sendMessage(jid,{text:`⚫ *ONLINE OFF*\nAb Offline 🌹`},{quoted:m});
        } else {
          await wa.sendMessage(jid,{text:`*Online:* ${alwaysOnline?'🟢 ON':'⚫ OFF'}\n.online on / .online off`},{quoted:m});
        }
        return;
      }

      // OWNER ONLY
      const ownerOnly = ['vv2','vv','vv3','tovv','antidelete','antidel'];
      if(ownerOnly.includes(cmd) && !isOwner(m)) return;

      if(cmd==='antidelete' || cmd==='antidel'){
        const sub = args[0]?.toLowerCase();
        if(sub==='on'){ antiDeleteEnabled=true; saveAntiDelete(); await wa.sendMessage(jid,{text:`✅ Antidelete ON`},{quoted:m}); }
        else if(sub==='off'){ antiDeleteEnabled=false; saveAntiDelete(); await wa.sendMessage(jid,{text:`❌ Antidelete OFF`},{quoted:m}); }
        else { await wa.sendMessage(jid,{text:`*Antidelete:* ${antiDeleteEnabled?'ON':'OFF'}\n.antidelete on / off`},{quoted:m}); }
        return;
      }

      // BUILT-IN PING ALIVE - 100% WORKING
      if(cmd==='ping'){
        const start = Date.now();
        await wa.sendMessage(jid,{text:`*PONG!* 🏓\n${Date.now()-start}ms\n🟢 Online: ${alwaysOnline?'ON':'OFF'}\n📦 ${commandsMap.size} Cmds\n\n🌹 Meri JAAN`},{quoted:m});
        return;
      }
      if(cmd==='alive'){
        const DP=getDP();
        await wa.sendMessage(jid,{image:{url:DP},caption:`*${config.botName || 'RANA MD'} ALIVE*\n✅ Online\n🟢 Presence: ${alwaysOnline?'ON':'OFF'}\n📦 ${commandsMap.size} Cmds\n🌹 Meri JAAN`},{quoted:m}).catch(async()=>{ await wa.sendMessage(jid,{text:`*ALIVE* ✅\n📦 ${commandsMap.size} Cmds`},{quoted:m}); });
        return;
      }

      // SAB COMMANDS FOLDER WALE
      if(commandsMap.has(cmd)){
        try{
          const fp=commandsMap.get(cmd);
          const mod=await import(pathToFileURL(fp).href+`?t=${Date.now()}`);
          const extra = { config, prefix: config.prefix, commands: commandsMap, conn: wa, isOwner: isOwner(m) };
          if(mod.execute){
            await mod.execute(wa, m, args, extra);
            return;
          }
          if(mod.default?.execute){
            await mod.default.execute(wa, m, args, extra);
            return;
          }
        }catch(e){ 
          console.log(`CMD ${cmd} FILE ERR`, e.message);
          await wa.sendMessage(jid,{text:`❌ .${cmd} me error:\n${e.message}\n\nFile check karo`},{quoted:m});
        }
      }
    }catch(e){console.log("upsert err",e)}
  });

  wa.ev.on('messages.update', async (updates)=>{
    try{
      if(!antiDeleteEnabled) return;
      for(const {key, update} of updates){
        if(update.messageStubType===1){
          const stored = messageStore.get(key.id);
          if(!stored?.message) continue;
          const privateJid = wa.user.id;
          let txt = stored.message.conversation || stored.message.extendedTextMessage?.text || "[Media]";
          await wa.sendMessage(privateJid, { text: `*🗑️ DELETED*\nFrom: ${stored.key.remoteJid}\nMsg: ${txt}\n\n🌹 Sirf tum` });
        }
      }
    }catch{}
  });

  wa.ev.on('connection.update',async (u)=>{ 
    const {connection,lastDisconnect}=u; 
    if(connection==='open'){ 
      status='CONNECTED';pairCode=null; loadCommands(); 
      setOnlinePresence(wa, alwaysOnline);
      console.log(`✅ ONLINE - ${commandsMap.size} CMDS`); 
    } else if(connection==='close'){ 
      status='DISCONNECTED';sock=null; 
      if(onlineInterval) clearInterval(onlineInterval);
      if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000); 
    } 
  });
  if(num){ await new Promise(r=>setTimeout(r,3500)); try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){} }
}
app.post('/pair', async (req,res)=>{ const n=normNum(req.body?.num); lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n); for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/'); }); 
app.listen(PORT,()=>console.log('BOT READY ON '+PORT));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();