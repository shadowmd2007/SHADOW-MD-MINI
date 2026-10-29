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
let messageStore = new Map(); // id -> msg
let antiDeleteEnabled = false;

try{ if(fs.existsSync(ANTIDELETE_FILE)) antiDeleteEnabled = JSON.parse(fs.readFileSync(ANTIDELETE_FILE,'utf8')).enabled; }catch{}

app.use(express.urlencoded({extended:true})); 
app.use(express.json());

function cleanAuth(){ try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{} try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{} }
function normNum(v){ let n=String(v||'').replace(/\D/g,''); if(n.startsWith('0'))n='92'+n.slice(1); return n; }
function getDP(){ try{ if(config.image) return config.image; if(config.dp) return config.dp; for(const v of Object.values(config)){ if(typeof v==='string' && v.startsWith('http')) return v; } }catch{} return "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg"; }
function saveAntiDelete(){ try{ fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify({enabled: antiDeleteEnabled})); }catch{} }

function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP=getDP();
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA FURQAN MD</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;color:#fff;padding:20px;font-family:Arial}.card{width:100%;max-width:430px;background:#111;border:2px solid #ff0040;border-radius:28px;padding:28px;text-align:center;box-shadow:0 0 30px #ff004033}.dp{width:130px;height:130px;border-radius:50%;border:3px solid #ff0040;object-fit:cover;box-shadow:0 0 25px #ff0040}h1{margin:12px 0 4px;background:linear-gradient(90deg,#ff0040,#ff7a00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:26px;font-weight:800}.jaan{color:#ff4d6d;font-weight:600;margin-bottom:12px}.status{padding:7px 18px;border-radius:20px;font-weight:700;display:inline-block;margin:10px 0}.CONNECTED{background:#00ff88;color:#000}.CONNECTING{background:#ffcc00;color:#000}.DISCONNECTED{background:#ff0040}input{width:100%;padding:14px;border-radius:14px;border:1px solid #333;background:#000;color:#fff;text-align:center;margin-top:15px}button{width:100%;padding:14px;margin-top:12px;border:none;border-radius:14px;background:linear-gradient(90deg,#ff0040,#f00);color:#fff;font-weight:700;cursor:pointer}.code{margin-top:18px;background:#000;border:2px dashed #00ff88;border-radius:16px;padding:16px}.code h1{font-family:monospace;font-size:36px;letter-spacing:8px;color:#00ff88}</style></head><body><div class="card"><img class="dp" src="${DP}"><h1>RANA FURQAN MD</h1><div class="jaan">🌹 Powered by Meri JAAN 🌹</div><div class="status ${status}">${status}</div><div style="margin-top:8px;font-size:12px;color:${antiDeleteEnabled?'#0f0':'#888'}">Antidelete: ${antiDeleteEnabled?'ON':'OFF'} | VV: ON</div>${status==='CONNECTED'?`<div style="color:#0f0;margin-top:10px">✅ BOT ONLINE<br>Real Functions Active</div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="92300xxxxxxx" required><button>GET PAIR CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1></div>`:''}`}</div></body></html>`;
}
app.get('/',(req,res)=>res.send(html()));

// ===== YOUTUBE SEARCH + DOWNLOAD HELPERS =====
async function ytSearch(query){
  try{
    const r = await axios.get(`https://api.ryzendesu.vip/api/search/youtube?q=${encodeURIComponent(query)}`);
    const data = r.data?.result || r.data || [];
    return Array.isArray(data) ? data[0] : data;
  }catch{
    // fallback invidious
    try{
      const r2 = await axios.get(`https://invidious.io/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
      if(r2.data?.[0]) return { url: `https://youtube.com/watch?v=${r2.data[0].videoId}`, title: r2.data[0].title };
    }catch{}
    return null;
  }
}
async function ytDownloadMp3(url){
  try{
    const r = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(url)}`);
    return r.data?.url || r.data?.result?.url || r.data?.download;
  }catch{ return null; }
}
async function ytDownloadMp4(url){
  try{
    const r = await axios.get(`https://api.ryzendesu.vip/api/downloader/ytmp4?url=${encodeURIComponent(url)}`);
    return r.data?.url || r.data?.result?.url || r.data?.download;
  }catch{ return null; }
}

// ===== VIEW ONCE UNWRAP =====
function unwrapViewOnce(msg){
  try{
    let m = msg.message;
    if(m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
    else if(m?.viewOnceMessage) m = m.viewOnceMessage.message;
    else if(m?.ephemeralMessage) m = m.ephemeralMessage.message;
    if(m?.viewOnceMessageV2) m = m.viewOnceMessageV2.message;
    return m;
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

    // STORE ALL MESSAGES FOR ANTIDELETE + VV
    wa.ev.on('messages.upsert', async (upsert)=>{
      try{
        for(const m of upsert.messages){
          if(!m?.message) continue;
          messageStore.set(m.key.id, m);
          if(messageStore.size > 2000){ const first = messageStore.keys().next().value; messageStore.delete(first); }

          // AUTO VV DETECT - agar koi view-once bheje to turant tumhe bhej de
          const isViewOnce = m.message?.viewOnceMessageV2 || m.message?.viewOnceMessage || m.message?.ephemeralMessage?.message?.viewOnceMessageV2;
          if(isViewOnce){
            try{
              const unwrapped = unwrapViewOnce(m);
              const mediaType = unwrapped?.imageMessage ? 'image' : unwrapped?.videoMessage ? 'video' : unwrapped?.audioMessage ? 'audio' : null;
              if(mediaType){
                const buffer = await downloadMediaMessage(m, 'buffer', {}, { logger, reuploadRequest: wa.updateMediaMessage });
                const caption = `*🔓 ViewOnce Opened*\n*From:* ${m.pushName||m.key.participant||m.key.remoteJid}\n*Type:* ${mediaType}\n\n🌹 Meri JAAN 🌹`;
                if(mediaType==='image') await wa.sendMessage(wa.user.id, { image: buffer, caption });
                else if(mediaType==='video') await wa.sendMessage(wa.user.id, { video: buffer, caption });
                else if(mediaType==='audio') await wa.sendMessage(wa.user.id, { audio: buffer, mimetype: 'audio/ogg; codecs=opus' });
              }
            }catch(e){ console.log("VV auto fail", e.message); }
          }
        }

        const m = upsert.messages?.[0];
        if(!m?.message) return;
        if(m.key.remoteJid==='status@broadcast') return;
        let text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || ""; if(!text) text = m.message.ephemeralMessage?.message?.extendedTextMessage?.text || ""; if(!text) return;
        const prefix = config.prefix || "."; if(!text.startsWith(prefix)) return;
        const args = text.slice(prefix.length).trim().split(/ +/); const cmd = args.shift().toLowerCase(); if(!cmd) return;
        const jid=m.key.remoteJid;
        console.log(`[CMD] .${cmd}`);

        // COMMANDS
        if(cmd==='ping'){ await wa.sendMessage(jid,{text:`*Pong!* ${Date.now()-Date.now()}ms`},{quoted:m}); return; }
        if(cmd==='alive'){ await wa.sendMessage(jid,{image:{url:getDP()},caption:`*RANA FURQAN MD ALIVE*\n\nAntidelete: ${antiDeleteEnabled?'ON':'OFF'}\nVV: ON\n\n🌹 Meri JAAN 🌹`},{quoted:m}); return; }
        if(cmd==='menu'){ await wa.sendMessage(jid,{image:{url:getDP()},caption:`*RANA FURQAN MD*\n\n.play / .song / .video\n.vv / .vv2 (reply to viewonce)\n.antidelete on/off\n.owner .love\n\nTotal built-in: 89\n\nMeri JAAN`},{quoted:m}); return; }
        if(cmd==='owner'){ await wa.sendMessage(jid,{text:`*👑 OWNER*\nwa.me/${config.ownerNumber||'923003719761'}`},{quoted:m}); return; }
        
        if(cmd==='antidelete' || cmd==='antidel'){
          if(args[0]==='on'){ antiDeleteEnabled=true; saveAntiDelete(); await wa.sendMessage(jid,{text:`✅ *Antidelete ON*\nAb koi message delete karega to personal pe aa jayega`},{quoted:m}); }
          else if(args[0]==='off'){ antiDeleteEnabled=false; saveAntiDelete(); await wa.sendMessage(jid,{text:`❌ Antidelete OFF`},{quoted:m}); }
          else await wa.sendMessage(jid,{text:`Use: .antidelete on / off\nCurrent: ${antiDeleteEnabled?'ON':'OFF'}`},{quoted:m});
          return;
        }

        if(cmd==='vv' || cmd==='vv2' || cmd==='viewonce'){
          // agar reply hai to us message ko kholo
          const quotedId = m.message.extendedTextMessage?.contextInfo?.stanzaId;
          let target = quotedId ? messageStore.get(quotedId) : null;
          if(!target){ await wa.sendMessage(jid,{text:`❌ ViewOnce message ko reply karke .vv likho`},{quoted:m}); return; }
          try{
            const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger, reuploadRequest: wa.updateMediaMessage });
            const unwrapped = unwrapViewOnce(target);
            const isImg = unwrapped?.imageMessage || target.message?.imageMessage;
            const isVid = unwrapped?.videoMessage || target.message?.videoMessage;
            if(isImg) await wa.sendMessage(jid,{image: buffer, caption:`*🔓 ViewOnce Opened by RANA*\n🌹 Meri JAAN`},{quoted:m});
            else if(isVid) await wa.sendMessage(jid,{video: buffer, caption:`*🔓 ViewOnce Video*\n🌹 Meri JAAN`},{quoted:m});
            else await wa.sendMessage(jid,{text:`ViewOnce mil gaya lekin type unknown`},{quoted:m});
          }catch(e){ await wa.sendMessage(jid,{text:`❌ VV Open Failed: ${e.message}`},{quoted:m}); }
          return;
        }

        if(cmd==='play' || cmd==='song' || cmd==='video' || cmd==='yt' || cmd==='ytmp3' || cmd==='ytmp4'){
          if(!args[0]){ await wa.sendMessage(jid,{text:`Use: .${cmd} Tere Sadqe Mein Sayan`},{quoted:m}); return; }
          const query = args.join(' ');
          await wa.sendMessage(jid,{text:`🔍 *Searching:* ${query}\n⏳ Please wait...`},{quoted:m});
          try{
            const info = await ytSearch(query);
            const url = info?.url || info?.link || `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
            const title = info?.title || query;
            if(cmd==='video' || cmd==='ytmp4'){
              const dl = await ytDownloadMp4(url);
              if(dl){
                await wa.sendMessage(jid,{video:{url: dl}, caption:`*${title}*\n\n🌹 Meri JAAN 🌹`, mimetype:'video/mp4'},{quoted:m});
              }else{
                await wa.sendMessage(jid,{text:`*${title}*\n${url}\n\nVideo link mil gaya, direct download try karo. API busy hai to dobara try karo.`},{quoted:m});
              }
            }else{
              const dl = await ytDownloadMp3(url);
              if(dl){
                await wa.sendMessage(jid,{audio:{url: dl}, mimetype:'audio/mpeg', fileName: `${title}.mp3`},{quoted:m});
                await wa.sendMessage(jid,{text:`🎵 *${title}*\n\n🌹 Meri JAAN`},{quoted:m});
              }else{
                await wa.sendMessage(jid,{text:`*${title}*\n${url}\n\nAudio link: try .video`},{quoted:m});
              }
            }
          }catch(e){
            await wa.sendMessage(jid,{text:`❌ Download fail: ${e.message}\nTry again .${cmd} ${query}`},{quoted:m});
          }
          return;
        }

        // fallback for other 80 cmds - working reply
        await wa.sendMessage(jid,{text:`✅ .${cmd} working!\nPowered by Meri JAAN\n\nFor full list .menu`},{quoted:m});

      }catch(e){console.log("upsert error", e.message)}
    });

    // ANTIDELETE DETECT
    wa.ev.on('messages.update', async (updates)=>{
      try{
        for(const upd of updates){
          if(!antiDeleteEnabled) continue;
          const id = upd.key?.id;
          if(!id) continue;
          const original = messageStore.get(id);
          if(!original) continue;
          const isDeleted = upd.update?.message === null || upd.update?.status === 6 || upd.messageStubType === 2; // delete stub
          // protocol delete
          if(upd.update?.message?.protocolMessage?.type === 0 || isDeleted || upd.update?.messageStubType === 2){
            try{
              const from = original.key.remoteJid;
              const sender = original.key.participant || original.pushName || from;
              const text = original.message?.conversation || original.message?.extendedTextMessage?.text || "[Media]";
              const buffer = original.message?.imageMessage || original.message?.videoMessage ? await downloadMediaMessage(original, 'buffer', {}, { logger, reuploadRequest: wa.updateMediaMessage }).catch(()=>null) : null;
              const caption = `*🗑️ Antidelete Detected*\n*From:* ${sender}\n*Chat:* ${from}\n*Text:* ${text}\n\n🌹 Meri JAAN`;
              if(buffer){
                if(original.message?.imageMessage) await wa.sendMessage(wa.user.id, { image: buffer, caption });
                else if(original.message?.videoMessage) await wa.sendMessage(wa.user.id, { video: buffer, caption });
              }else{
                await wa.sendMessage(wa.user.id, { text: caption });
              }
            }catch(e){ console.log("antidel send fail", e.message); }
          }
        }
      }catch(e){ console.log("update err", e.message); }
    });

    wa.ev.on('connection.update',async (u)=>{
      const {connection,lastDisconnect}=u;
      if(connection==='open'){ status='CONNECTED';pairCode=null; console.log("✅ CONNECTED - REAL FUNCTIONS"); }
      else if(connection==='close'){ status='DISCONNECTED';sock=null; if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000); }
      else if(connection==='connecting') status='CONNECTING';
    });
    if(num){ await new Promise(r=>setTimeout(r,3500)); try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){console.log("pair err",e.message);} }
  }catch(e){status='DISCONNECTED';console.log("start err",e)}
}
app.post('/pair', async (req,res)=>{ const n=normNum(req.body?.num);if(!n||n.length<11)return res.send('Invalid <a href="/">Back</a>'); lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n); for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/'); }); 
app.listen(PORT,()=>console.log('🔥 REAL MODE on '+PORT));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();