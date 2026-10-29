// Yeh final fixed index hai - isse words + vv2 private + video fix hoga
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
let messageStore = new Map();
let commandsMap = new Map();

app.use(express.urlencoded({extended:true})); app.use(express.json());
function cleanAuth(){ try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{} try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{} }
function normNum(v){ let n=String(v||'').replace(/\D/g,''); if(n.startsWith('0'))n='92'+n.slice(1); return n; }
function getDP(){ return config.menuImage || config.botImage || "https://i.ibb.co/BHfCmfbw/jawadmd.jpg"; }
function loadCommands(){ commandsMap.clear(); const dir=path.join(__dirname,'commands'); if(!fs.existsSync(dir)) return; const scan=(d)=>{ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); if(fs.statSync(p).isDirectory()) scan(p); else if(f.endsWith('.js')) commandsMap.set(f.replace('.js','').toLowerCase(),p);} }; try{scan(dir);}catch{} }
loadCommands();

function html(){ const valid=pairCode&&Date.now()-pairTime<65000; return `<html><body style="background:#000;color:#fff;text-align:center;padding:30px;font-family:Arial"><h1>RANA FIXED</h1><div>${status} | ${commandsMap.size} Cmds</div>${status!=='CONNECTED'?`<form method="post" action="/pair"><input name="num" placeholder="92300..." required><button>GET CODE</button></form>${valid?`<h1 style="color:#0f0">${pairCode}</h1>`:''}`:`<div style="color:#0f0">ONLINE</div>`}</body></html>`;}
app.get('/',(req,res)=>res.send(html()));

// 17 WORDS JO AB KAAM KARENGE
const BEAUTIFUL_WORDS = ["MashaAllah 🌹","SubhanAllah ✨","Cute 🥰","Nice 😍","Beautiful 💖","Mashallah 🌹","Zabardast 🔥","Lovely 💕","Amazing 😍","Awesome 🤩","Behtreen 🌹","Wah 😍","Super 👌","Excellent 💫","Good 😊","Wow 🤩","Meri JAAN 🌹"];

async function startBot(num){
  if(num){lastNumber=num;cleanAuth();}
  if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
  const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
  const {version} = await fetchLatestBaileysVersion();
  const wa = makeWASocket({ version, logger, printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,logger)}, browser:['Ubuntu','Chrome','20.0.04'], getMessage: async (key) => messageStore.get(key.id) });
  sock=wa; status='CONNECTING';
  wa.ev.on('creds.update', saveCreds);
  wa.ev.on('messages.upsert', async (upsert)=>{
    for(const m of upsert.messages){ if(m?.message) messageStore.set(m.key.id, m); }
    const m = upsert.messages?.[0]; if(!m?.message) return;
    if(m.key.remoteJid==='status@broadcast') return;
    let text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""; 
    const jid=m.key.remoteJid;
    if(!text) return;

    // WORDS AUTO REACT FIX
    if(!text.startsWith(config.prefix)){
      const lower=text.toLowerCase();
      if(config.keywords?.some(k=> lower.includes(k.toLowerCase()))){
        try{ await wa.sendMessage(jid, { react: { text: '🌹', key: m.key } }); }catch{}
      }
      return;
    }

    const args = text.slice(config.prefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase();
    // FILE WALA COMMAND PEHLE CHALAO - ISILIE VIDEO FAIL NAHI HOGA
    if(commandsMap.has(cmd)){
      try{
        const fp=commandsMap.get(cmd);
        const mod=await import(pathToFileURL(fp).href+`?t=${Date.now()}`);
        if(mod.command?.run){
          const ctx = { args, sock: wa, jid, m, prefix: config.prefix, reply: async (t)=>{ await wa.sendMessage(jid, { text: t }, { quoted: m }); } };
          await mod.command.run(ctx);
          return;
        }
        let fn = mod.default?.execute || mod.execute;
        if(fn){ await fn(wa,m,args,{config,prefix:config.prefix}); return; }
      }catch(e){ await wa.sendMessage(jid,{text:`❌ .${cmd} Error: ${e.message}`},{quoted:m}); return; }
    }
  });
  wa.ev.on('connection.update',async (u)=>{ const {connection,lastDisconnect}=u; if(connection==='open'){ status='CONNECTED';pairCode=null; loadCommands(); } else if(connection==='close'){ status='DISCONNECTED';sock=null; if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000); } });
  if(num){ await new Promise(r=>setTimeout(r,3500)); try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){} }
}
app.post('/pair', async (req,res)=>{ const n=normNum(req.body?.num); lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n); for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/'); }); 
app.listen(PORT,()=>console.log('FIXED on '+PORT));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();