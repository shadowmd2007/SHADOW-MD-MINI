import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';
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
function getDP(){ if(config.menuImage?.startsWith('http')) return config.menuImage; if(config.botImage?.startsWith('http')) return config.botImage; return "https://i.ibb.co/BHfCmfbw/jawadmd.jpg"; }
function loadCommands(){ commandsMap.clear(); const dir=path.join(__dirname,'commands'); if(!fs.existsSync(dir)) return; const scan=(d)=>{ for(const f of fs.readdirSync(d)){ const p=path.join(d,f); if(fs.statSync(p).isDirectory()) scan(p); else if(f.endsWith('.js')) commandsMap.set(f.replace('.js','').toLowerCase(),p);} }; scan(dir); }
loadCommands();
function html(){ const valid=pairCode&&Date.now()-pairTime<65000; const DP=getDP(); return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;color:#fff;padding:20px;font-family:Arial}.card{width:100%;max-width:430px;background:#111;border:2px solid #ff0040;border-radius:28px;padding:28px;text-align:center}.dp{width:130px;height:130px;border-radius:50%;border:3px solid #ff0040;object-fit:cover}.status{padding:7px 18px;border-radius:20px;font-weight:700;display:inline-block;margin:10px 0}.CONNECTED{background:#0f0;color:#000}.DISCONNECTED{background:#f00}input,button{width:100%;padding:14px;margin-top:12px;border-radius:14px}input{background:#000;color:#fff;border:1px solid #333;text-align:center}button{background:#f00;color:#fff;border:none;font-weight:700}.code{margin-top:18px;background:#000;border:2px dashed #0f0;border-radius:16px;padding:16px}.code h1{font-family:monospace;font-size:34px;color:#0f0;letter-spacing:6px}</style></head><body><div class="card"><img class="dp" src="${DP}"><h1>RANA FURQAN MD</h1><div style="color:#ff4d6d">🌹 Meri JAAN 🌹</div><div class="status ${status}">${status}</div><div style="font-size:12px;color:#0f0">${commandsMap.size} Cmds | VV: ON | Antidelete ${antiDeleteEnabled?'ON':'OFF'}</div>${status==='CONNECTED'?`<div style="color:#0f0;margin-top:10px">✅ ONLINE</div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="92300..." required><button>GET CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1></div>`:''}`}</div></body></html>`;}
app.get('/',(req,res)=>res.send(html()));
function saveAntiDelete(){ try{ fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify({enabled: antiDeleteEnabled})); }catch{} }

// REAL VIDEO DOWNLOAD WITH YT-SEARCH + YTDL
async function downloadSong(query, type){
  try{
    const yts = await import('yt-search');
    const search = await yts.default(query);
    const video = search.videos[0];
    if(!video) return null;
    
    if(type==='mp3'){
      // Try ytdl for audio
      const ytdl = await import('@distube/ytdl-core');
      const info = await ytdl.default.getInfo(video.url);
      const format = ytdl.default.chooseFormat(info.formats, { quality: 'highestaudio' });
      return { url: format.url, title: video.title, direct: true, buffer: false };
    }else{
      const ytdl = await import('@distube/ytdl-core');
      const info = await ytdl.default.getInfo(video.url);
      const format = ytdl.default.chooseFormat(info.formats, { quality: 'lowestvideo', filter: 'videoandaudio' });
      return { url: format.url, title: video.title, direct: true };
    }
  }catch(e){ console.log("ytdl fail", e.message); }
  // Fallback API
  try{
    const r = await axios.get(`https://api.ryzendesu.vip/api/search/youtube?q=${encodeURIComponent(query)}`);
    const v = r.data?.result?.[0] || r.data?.[0];
    if(v?.url){
      const dlApi = type==='mp4' ? 'ytmp4' : 'ytmp3';
      const r2 = await axios.get(`https://api.ryzendesu.vip/api/downloader/${dlApi}?url=${encodeURIComponent(v.url)}`);
      return { url: r2.data?.url || r2.data?.result?.url, title: v.title || query, direct: false };
    }
  }catch{}
  return null;
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
        const jid=m.key.remoteJid; const DP=getDP();
        console.log(`[CMD] .${cmd}`);

        // VV FIX - QUOTED MESSAGE SE DIRECT NIKALNA
        if(['vv','vv2','vv3','viewonce','vo'].includes(cmd)){
          let target = null;
          const ctx = m.message.extendedTextMessage?.contextInfo;
          if(ctx?.quotedMessage){
            // quotedMessage viewonce ho sakta hai
            target = { key: { id: ctx.stanzaId }, message: ctx.quotedMessage, pushName: 'Quoted' };
            // agar quotedMessage ke andar viewOnce hai to unwrap
            if(ctx.quotedMessage.viewOnceMessageV2) target.message = ctx.quotedMessage.viewOnceMessageV2.message;
            if(ctx.quotedMessage.viewOnceMessage) target.message = ctx.quotedMessage.viewOnceMessage.message;
          }else if(ctx?.stanzaId){
            target = messageStore.get(ctx.stanzaId);
          }
          if(!target){
            await wa.sendMessage(jid,{text:`❌ ViewOnce photo/video ko *reply* karke .vv2 likho\n\nExample: Photo pe long press > Reply > .vv2`},{quoted:m});
            return;
          }
          try{
            const buf = await downloadMediaMessage(target, 'buffer', {}, { logger, reuploadRequest: wa.updateMediaMessage });
            const isImg = target.message?.imageMessage || target.message?.viewOnceMessageV2?.message?.imageMessage;
            if(isImg || buf.length < 5*1024*1024){
              // try image first
              try{ await wa.sendMessage(jid,{image: buf, caption:`*🔓 ViewOnce Opened*\n🌹 Meri JAAN`},{quoted:m}); return; }catch{}
            }
            await wa.sendMessage(jid,{video: buf, caption:`*🔓 ViewOnce Video*\nMeri JAAN`},{quoted:m});
          }catch(e){ await wa.sendMessage(jid,{text:`❌ Open Fail: ${e.message}\nDobara reply karke .vv2 likho`},{quoted:m}); }
          return;
        }

        if(cmd==='ping'){ await wa.sendMessage(jid,{text:`*Pong!* ✅`},{quoted:m}); return; }
        if(cmd==='alive'){ await wa.sendMessage(jid,{image:{url:DP},caption:`*ALIVE*\n${commandsMap.size} Cmds\nMeri JAAN`},{quoted:m}); return; }
        if(cmd==='menu'){ 
          // menu.js file ko call karega
          try{
            const fp=commandsMap.get('menu');
            if(fp){ const mod=await import(pathToFileURL(fp).href+`?t=${Date.now()}`); const fn=mod.execute||mod.default?.execute||mod.default; if(fn){ await fn(wa,m,args,{config,prefix,commands:commandsMap}); return; } }
          }catch{}
          const list=[...commandsMap.keys()].sort().join(', '); await wa.sendMessage(jid,{image:{url:DP},caption:`*MENU*\n${list}`},{quoted:m}); return;
        }
        if(cmd==='owner'){ await wa.sendMessage(jid,{text:`*OWNER*\n${config.ownerName}\nwa.me/${config.ownerNumber}`},{quoted:m}); return; }
        if(cmd==='antidelete'){ if(args[0]==='on'){ antiDeleteEnabled=true; saveAntiDelete(); await wa.sendMessage(jid,{text:`✅ Antidelete ON`},{quoted:m}); } else { antiDeleteEnabled=false; saveAntiDelete(); await wa.sendMessage(jid,{text:`❌ OFF`},{quoted:m}); } return; }

        if(['play','song','video','yt','ytmp3','ytmp4'].includes(cmd)){
          if(!args[0]){ await wa.sendMessage(jid,{text:`Use: .${cmd} Tere Meri Prem Kahani`},{quoted:m}); return; }
          const query=args.join(' '); await wa.sendMessage(jid,{text:`🔍 *${query}* search...\n⏳ 10 sec wait, direct video bhejunga`},{quoted:m});
          const result=await downloadSong(query, cmd==='video'?'mp4':'mp3');
          if(!result){ await wa.sendMessage(jid,{text:`❌ Fail: ${query}\nDobara try karo`},{quoted:m}); return; }
          if(cmd==='video' || cmd==='ytmp4'){
            try{ await wa.sendMessage(jid,{video:{url:result.url}, caption:`*${result.title}*\n🌹 Meri JAAN`, mimetype:'video/mp4'},{quoted:m}); }
            catch{ await wa.sendMessage(jid,{text:`Video ready: ${result.title}\n${result.url}`},{quoted:m}); }
          }else{
            try{ await wa.sendMessage(jid,{audio:{url:result.url}, mimetype:'audio/mpeg', fileName:`${result.title}.mp3`},{quoted:m}); }
            catch{ await wa.sendMessage(jid,{text:`Song: ${result.title}\n${result.url}`},{quoted:m}); }
          }
          return;
        }

        if(commandsMap.has(cmd)){
          try{ const fp=commandsMap.get(cmd); const mod=await import(pathToFileURL(fp).href+`?t=${Date.now()}`); let fn=mod.execute||mod.default?.execute||mod.default; if(!fn){ for(const k of Object.keys(mod)){ const v=mod[k]; if(v?.execute) {fn=v.execute;break;} if(typeof v==='function'){fn=v;break;} } } if(fn){ await fn(wa,m,args,{config,prefix,commands:commandsMap, conn:wa}); return; } }catch(e){ console.log(e.message); }
        }
        await wa.sendMessage(jid,{text:`❌ .${cmd} not found. .menu`},{quoted:m});
      }catch(e){console.log("upsert",e.message)}
    });
    wa.ev.on('connection.update',async (u)=>{ const {connection,lastDisconnect}=u; if(connection==='open'){ status='CONNECTED';pairCode=null; loadCommands(); console.log("✅ ONLINE "+getDP()); } else if(connection==='close'){ status='DISCONNECTED';sock=null; if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000); } else if(connection==='connecting') status='CONNECTING'; });
    if(num){ await new Promise(r=>setTimeout(r,3500)); try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){} }
  }catch(e){status='DISCONNECTED';console.log(e)}
}
app.post('/pair', async (req,res)=>{ const n=normNum(req.body?.num);if(!n||n.length<11)return res.send('Invalid <a href="/">Back</a>'); lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n); for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/'); }); 
app.listen(PORT,()=>console.log('🔥 FIXED VV + VIDEO on '+PORT));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();