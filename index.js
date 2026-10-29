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
const logger = pino({ level: 'silent' });

let sock=null,status='DISCONNECTED',pairCode=null,pairTime=0,lastNumber='';
let messageStore = new Map();
let commandsMap = new Map();
let antiDeleteEnabled = false;
try{ if(fs.existsSync(ANTIDELETE_FILE)) antiDeleteEnabled = JSON.parse(fs.readFileSync(ANTIDELETE_FILE,'utf8')).enabled; }catch{}

app.use(express.urlencoded({extended:true})); app.use(express.json());

function cleanAuth(){ try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{} try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{} }
function normNum(v){ let n=String(v||'').replace(/\D/g,''); if(n.startsWith('0'))n='92'+n.slice(1); return n; }
function getDP(){ if(config.menuImage?.startsWith('http')) return config.menuImage; if(config.botImage?.startsWith('http')) return config.botImage; return "https://i.ibb.co/BHfCmfbw/jawadmd.jpg"; }
function loadCommands(){ commandsMap.clear(); const dir=path.join(__dirname,'commands'); if(!fs.existsSync(dir)) return; const scan=(d)=>{ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); if(fs.statSync(p).isDirectory()) scan(p); else if(f.endsWith('.js')) commandsMap.set(f.replace('.js','').toLowerCase(),p);} }; try{scan(dir);}catch{} }
loadCommands();
function saveAntiDelete(){ try{ fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify({enabled: antiDeleteEnabled})); }catch{} }

function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP=getDP();
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA FURQAN MD</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;color:#fff;padding:20px;font-family:Arial}.card{width:100%;max-width:430px;background:#111;border:2px solid #ff0040;border-radius:28px;padding:28px;text-align:center;box-shadow:0 0 20px rgba(255,0,64,0.4)}.dp{width:130px;height:130px;border-radius:50%;border:3px solid #ff0040;object-fit:cover;box-shadow:0 0 15px #ff0040}.status{padding:7px 18px;border-radius:20px;font-weight:700;display:inline-block;margin:10px 0}.CONNECTED{background:#0f0;color:#000}.DISCONNECTED{background:#f00}.CONNECTING{background:#ff0;color:#000}input,button{width:100%;padding:14px;margin-top:12px;border-radius:14px}input{background:#000;color:#fff;border:1px solid #333;text-align:center}button{background:#ff0040;color:#fff;border:none;font-weight:700;cursor:pointer}.code{margin-top:18px;background:#000;border:2px dashed #0f0;border-radius:16px;padding:16px}.code h1{font-family:monospace;font-size:34px;color:#0f0;letter-spacing:6px;margin:0}</style></head><body><div class="card"><img class="dp" src="${DP}"><h1 style="margin:10px 0 0 0">RANA FURQAN MD</h1><div style="color:#ff4d6d;font-weight:700;margin-top:5px">🌹 Meri JAAN 🌹</div><div class="status ${status}">${status}</div><div style="font-size:12px;color:#0f0;margin-top:5px">${commandsMap.size} Cmds | Antidelete ${antiDeleteEnabled?'ON':'OFF'} | Words ON</div>${status==='CONNECTED'?`<div style="color:#0f0;margin-top:15px;font-weight:700">✅ BOT ONLINE<br><span style="font-size:12px;color:#888">.menu picture ready</span></div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923001234567" required><button>GET PAIR CODE</button></form>${valid?`<div class="code"><div style="color:#0f0;font-size:12px">YOUR CODE</div><h1>${pairCode}</h1><div style="font-size:12px;color:#888">WhatsApp > Linked Devices > Link with code</div></div>`:`<div style="margin-top:12px;font-size:12px;color:#888">Number likho aur code lo</div>`}`}</div></body></html>`;
}
app.get('/',(req,res)=>res.send(html()));

// YE 17 WORDS - AB KAAM KARENGE
const WORDS_LIST = ["mashaallah","subhanallah","cute","amazing","beautiful","mashallah","zabardast","lovely","nice","awesome","behtreen","wah","super","excellent","good","wow","meri jaan"];

async function startBot(num){
  try{
    if(num){lastNumber=num;cleanAuth();}
    if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
    const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();
    const wa = makeWASocket({ version, logger, printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,logger)}, browser:['Ubuntu','Chrome','20.0.04'], markOnlineOnConnect:false, syncFullHistory:false, getMessage: async (key) => messageStore.get(key.id) });
    sock=wa; status='CONNECTING';
    wa.ev.on('creds.update', saveCreds);
    wa.ev.on('messages.upsert', async (upsert)=>{
      try{
        for(const m of upsert.messages){ if(m?.message) messageStore.set(m.key.id, m); }
        const m = upsert.messages?.[0]; if(!m?.message) return;
        if(m.key.remoteJid==='status@broadcast') return;
        let text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""; 
        const jid=m.key.remoteJid;

        // --- WORDS AUTO REACT - KUCH GAYAB NAHI, SIRF ADD KIYA ---
        if(text && !text.startsWith(config.prefix)){
          const lower = text.toLowerCase();
          if(WORDS_LIST.some(k=> lower.includes(k))){
            try{ await wa.sendMessage(jid, { react: { text: '🌹', key: m.key } }); }catch{}
          }
        }

        if(!text.startsWith(config.prefix)) return;
        const args = text.slice(config.prefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase(); if(!cmd) return;

        // --- COMMAND FILE KO PEHLE CHALAO TAKE VIDEO/PLAY FAIL NA HO ---
        if(commandsMap.has(cmd)){
          try{
            const fp=commandsMap.get(cmd);
            const mod=await import(pathToFileURL(fp).href+`?t=${Date.now()}`);
            if(mod.command?.run){
              const ctx = { args, sock: wa, jid, m, prefix: config.prefix, reply: async (t)=>{ await wa.sendMessage(jid, { text: t }, { quoted: m }); } };
              await mod.command.run(ctx);
              return;
            }
            let fn = mod.default?.execute || mod.execute || mod.command || mod.default;
            if(typeof fn==='function'){ await fn(wa,m,args,{config,prefix:config.prefix,commands:commandsMap, conn:wa}); return; }
          }catch(e){ console.log(`File ${cmd} error:`, e.message); await wa.sendMessage(jid,{text:`❌ .${cmd} Error: ${e.message}`},{quoted:m}); return; }
        }
      }catch(e){console.log("upsert",e.message)}
    });
    wa.ev.on('connection.update',async (u)=>{ const {connection,lastDisconnect}=u; if(connection==='open'){ status='CONNECTED';pairCode=null; loadCommands(); console.log("✅ ONLINE - FULL FIXED NO REMOVE"); } else if(connection==='close'){ status='DISCONNECTED';sock=null; if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000); } });
    if(num){ await new Promise(r=>setTimeout(r,3500)); try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){} }
  }catch(e){status='DISCONNECTED';console.log(e)}
}
app.post('/pair', async (req,res)=>{ const n=normNum(req.body?.num);if(!n||n.length<11)return res.send('Invalid <a href="/">Back</a>'); lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n); for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/'); }); 
app.listen(PORT,()=>console.log('🔥 FULL ORIGINAL + FIX on '+PORT));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();