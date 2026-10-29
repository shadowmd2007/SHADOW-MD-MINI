import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath, pathToFileURL } from 'node:url';
import baileys from '@whiskeysockets/baileys';
import { config } from './config.js';
import axios from 'axios';

const makeWASocket = baileys.default || baileys.makeWASocket;
const { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason, downloadMediaMessage } = baileys;

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

app.use(express.urlencoded({extended:true})); 
app.use(express.json());

function cleanAuth(){ try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{} try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{} }
function normNum(v){ let n=String(v||'').replace(/\D/g,''); if(n.startsWith('0'))n='92'+n.slice(1); return n; }

// AB SAHI DP - TUMHARI CONFIG KE MUTABIQ
function getDP(){
  // Tumhari config me ye 2 hain
  if(config.menuImage && config.menuImage.startsWith('http')) return config.menuImage;
  if(config.botImage && config.botImage.startsWith('http')) return config.botImage;
  return "https://i.ibb.co/BHfCmfbw/jawadmd.jpg";
}

function loadCommands(){
  commandsMap.clear();
  const dir = path.join(__dirname,'commands');
  if(!fs.existsSync(dir)) return;
  const scan = (d) => {
    try{
      for(const f of fs.readdirSync(d)){
        const p = path.join(d,f);
        if(fs.statSync(p).isDirectory()) scan(p);
        else if(f.endsWith('.js')) commandsMap.set(f.replace('.js','').toLowerCase(), p);
      }
    }catch{}
  };
  scan(dir);
  console.log(`✅ ${commandsMap.size} commands`);
}
loadCommands();

function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP=getDP();
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA FURQAN MD</title><style>body{margin:0;min-height:100vh;background:radial-gradient(circle,#1a0000,#000);display:flex;justify-content:center;align-items:center;color:#fff;padding:20px;font-family:Arial}.card{width:100%;max-width:430px;background:#111;border:2px solid #ff0040;border-radius:28px;padding:28px;text-align:center;box-shadow:0 0 30px #ff004033}.dp{width:140px;height:140px;border-radius:50%;border:3px solid #ff0040;object-fit:cover;box-shadow:0 0 25px #ff0040}.status{padding:7px 18px;border-radius:20px;font-weight:700;display:inline-block;margin:10px 0}.CONNECTED{background:#00ff88;color:#000}.CONNECTING{background:#ffcc00;color:#000}.DISCONNECTED{background:#ff0040}input{width:100%;padding:14px;border-radius:14px;border:1px solid #333;background:#000;color:#fff;text-align:center;margin-top:15px}button{width:100%;padding:14px;margin-top:12px;border:none;border-radius:14px;background:linear-gradient(90deg,#ff0040,#f00);color:#fff;font-weight:700;cursor:pointer}.code{margin-top:18px;background:#000;border:2px dashed #00ff88;border-radius:16px;padding:16px}.code h1{font-family:monospace;font-size:36px;letter-spacing:8px;color:#00ff88}</style></head><body><div class="card"><img class="dp" src="${DP}"><h1>RANA FURQAN MD</h1><div style="color:#ff4d6d;font-weight:600;margin-bottom:10px">🌹 Powered by Meri JAAN 🌹</div><div class="status ${status}">${status}</div><div style="font-size:12px;color:${antiDeleteEnabled?'#0f0':'#888'}">${commandsMap.size} Commands | Antidelete ${antiDeleteEnabled?'ON':'OFF'}</div>${status==='CONNECTED'?`<div style="color:#0f0;margin-top:10px">✅ BOT ONLINE</div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923003719761" required><button>GET PAIR CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1></div>`:''}`}</div></body></html>`;
}
app.get('/',(req,res)=>res.send(html()));
function saveAntiDelete(){ try{ fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify({enabled: antiDeleteEnabled})); }catch{} }

async function ytSearch(query){
  try{
    const r = await axios.get(`https://api.ryzendesu.vip/api/search/youtube?q=${encodeURIComponent(query)}`);
    const list = r.data?.result || r.data || [];
    if(Array.isArray(list) && list[0]) return list[0];
    if(list?.url) return list;
  }catch{}
  return { url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, title: query };
}
async function ytDownload(url, type='mp3'){
  try{
    const api = type==='mp4' ? 'ytmp4' : 'ytmp3';
    const r = await axios.get(`https://api.ryzendesu.vip/api/downloader/${api}?url=${encodeURIComponent(url)}`);
    return r.data?.url || r.data?.result?.url || r.data?.downloadUrl;
  }catch{ return null; }
}

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
        let text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""; if(!text) return;
        const prefix = config.prefix || "."; if(!text.startsWith(prefix)) return;
        const args = text.slice(prefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase(); if(!cmd) return;
        const jid=m.key.remoteJid;
        const DP=getDP();
        console.log(`[CMD] .${cmd}`);

        async function sendMenuImage(caption){
          try{
            await wa.sendMessage(jid,{image:{url:DP},caption},{quoted:m});
          }catch(e){
            console.log("Image send fail, sending text", e.message);
            await wa.sendMessage(jid,{text:caption},{quoted:m});
          }
        }

        if(cmd==='ping'){ await wa.sendMessage(jid,{text:`*Pong!* ✅`},{quoted:m}); return; }
        if(cmd==='alive'){ await sendMenuImage(`*RANA FURQAN MD ALIVE*\n\nBot: ${config.botName}\nTotal: ${commandsMap.size} Commands\n\n🌹 Meri JAAN 🌹`); return; }
        if(cmd==='menu' || cmd==='help'){
          const list = [...commandsMap.keys()].sort().join(', ');
          await sendMenuImage(`*╭─── ${config.botName} ───╮*\n\n*Total: ${commandsMap.size} Commands*\n\n${list}\n\n*╰─── Meri JAAN ───╯*\n\n.play name\n.video name\n.vv2 (reply)\n.antidelete on/off`);
          return;
        }
        if(cmd==='owner'){ await wa.sendMessage(jid,{text:`*👑 OWNER*\n${config.ownerName}\nwa.me/${config.ownerNumber}`},{quoted:m}); return; }
        if(cmd==='antidelete'){
          if(args[0]==='on'){ antiDeleteEnabled=true; saveAntiDelete(); await wa.sendMessage(jid,{text:`✅ Antidelete ON`},{quoted:m}); }
          else if(args[0]==='off'){ antiDeleteEnabled=false; saveAntiDelete(); await wa.sendMessage(jid,{text:`❌ Antidelete OFF`},{quoted:m}); }
          else await wa.sendMessage(jid,{text:`Use: .antidelete on/off`},{quoted:m});
          return;
        }
        if(cmd==='vv' || cmd==='vv2'){
          const qId = m.message.extendedTextMessage?.contextInfo?.stanzaId;
          const target = qId ? messageStore.get(qId) : null;
          if(!target){ await wa.sendMessage(jid,{text:`❌ ViewOnce ko reply karke .vv2 likho`},{quoted:m}); return; }
          try{
            const buf = await downloadMediaMessage(target, 'buffer', {}, { logger, reuploadRequest: wa.updateMediaMessage });
            const isImg = target.message?.imageMessage || target.message?.viewOnceMessageV2?.message?.imageMessage || target.message?.viewOnceMessage?.message?.imageMessage;
            if(isImg) await wa.sendMessage(jid,{image: buf, caption:`*🔓 ViewOnce Opened*\nMeri JAAN`},{quoted:m});
            else await wa.sendMessage(jid,{video: buf, caption:`*🔓 ViewOnce Video*\nMeri JAAN`},{quoted:m});
          }catch(e){ await wa.sendMessage(jid,{text:`❌ VV Fail: ${e.message}`},{quoted:m}); }
          return;
        }
        if(cmd==='play' || cmd==='song' || cmd==='video'){
          if(!args[0]){ await wa.sendMessage(jid,{text:`Use: .${cmd} Tere Sadqe Mein Sayan`},{quoted:m}); return; }
          const query = args.join(' ');
          await wa.sendMessage(jid,{text:`🔍 Searching: *${query}*...`},{quoted:m});
          const info = await ytSearch(query);
          const url = info.url; const title = info.title || query;
          const dl = await ytDownload(url, cmd==='video' ? 'mp4' : 'mp3');
          if(dl){
            if(cmd==='video') await wa.sendMessage(jid,{video:{url: dl}, caption:`*${title}*\n🌹 Meri JAAN`, mimetype:'video/mp4'},{quoted:m});
            else await wa.sendMessage(jid,{audio:{url: dl}, mimetype:'audio/mpeg', fileName: `${title}.mp3`},{quoted:m});
          }else{
            await wa.sendMessage(jid,{text:`*${title}*\n${url}\n\nLink mil gaya, API busy. Dobara try karo`},{quoted:m});
          }
          return;
        }
        // ORIGINAL FILE TRY
        if(commandsMap.has(cmd)){
          try{
            const fp=commandsMap.get(cmd);
            const mod=await import(pathToFileURL(fp).href+`?t=${Date.now()}`);
            let fn=mod.default?.execute||mod.execute||mod.default;
            if(!fn){ for(const k of Object.keys(mod)){ const v=mod[k]; if(v && typeof v.execute==='function'){fn=v.execute;break;} if(typeof v==='function'){fn=v;break;} } }
            if(fn){ await fn(wa,m,args,{config,prefix,commands:commandsMap}); return; }
          }catch(e){ console.log(`File ${cmd} error:`, e.message); }
        }
        await wa.sendMessage(jid,{text:`❌ .${cmd} not found. .menu likho`},{quoted:m});
      }catch(e){console.log("upsert error", e.message)}
    });

    wa.ev.on('connection.update',async (u)=>{
      const {connection,lastDisconnect}=u;
      if(connection==='open'){ status='CONNECTED';pairCode=null; console.log("✅ CONNECTED - DP FIXED: "+getDP()); }
      else if(connection==='close'){ status='DISCONNECTED';sock=null; if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000); }
      else if(connection==='connecting') status='CONNECTING';
    });
    if(num){ await new Promise(r=>setTimeout(r,3500)); try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){console.log("pair err",e.message);} }
  }catch(e){status='DISCONNECTED';console.log("start err",e)}
}
app.post('/pair', async (req,res)=>{ const n=normNum(req.body?.num);if(!n||n.length<11)return res.send('Invalid <a href="/">Back</a>'); lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n); for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/'); }); 
app.listen(PORT,()=>console.log('🔥 DP FIXED - Image: '+getDP()+' on '+PORT));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();