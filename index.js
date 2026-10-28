import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';
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
app.use(express.urlencoded({extended:true})); app.use(express.json());
function cleanAuth(){try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{}try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{}}
function normNum(v){let n=String(v||'').replace(/\D/g,'');if(n.startsWith('0'))n='92'+n.slice(1);return n;}

// ✅ YE FUNCTION KHUD CONFIG SE DP DHONDEGA - CHAHE NAAM KUCH BHI HO
function getConfigDP(){
  try{
    // 1. Common naam check
    const keys = ['botImage','botPic','botImg','botDP','thumbnail','thumb','menuImage','ownerPic','ownerImg','pp','profilePic','logo','image','botThumbnail'];
    for(const k of keys){
      if(config[k] && typeof config[k]==='string' && config[k].startsWith('http')) return config[k];
    }
    // 2. Config ke andar koi bhi http wali image dhoondo
    for(const val of Object.values(config)){
      if(typeof val==='string' && val.startsWith('http') && (val.includes('.jpg')||val.includes('.png')||val.includes('.jpeg')||val.includes('ibb.co')||val.includes('imgur'))){
        return val;
      }
      // Agar object hai to uske andar bhi check
      if(typeof val==='object' && val!==null){
        for(const v2 of Object.values(val)){
          if(typeof v2==='string' && v2.startsWith('http') && v2.includes('http')) return v2;
        }
      }
    }
  }catch{}
  return "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg";
}

function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP = getConfigDP();
  const botName = config.botName || config.botname || config.BOT_NAME || "RANA FURQAN MD";
  return`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${botName}</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px}.c{width:100%;max-width:420px;background:#111;border:2px solid #f00;border-radius:22px;padding:25px;text-align:center}.dp{width:110px;height:110px;border-radius:50%;border:3px solid #f00;object-fit:cover;margin-bottom:10px;box-shadow:0 0 20px #f00}input{width:100%;padding:14px;border-radius:12px;border:2px solid #f00;background:#000;color:#fff;font-size:18px;text-align:center;box-sizing:border-box;margin-top:12px}button{width:100%;padding:14px;border-radius:12px;border:0;background:red;color:#fff;font-weight:bold;margin-top:12px}.code{margin-top:18px;background:#000;border:2px dashed #0f0;border-radius:15px;padding:16px}.code h1{font-family:monospace;font-size:34px;letter-spacing:5px;color:#0f0;margin:10px 0}.st{padding:7px 16px;border-radius:20px;font-weight:bold;display:inline-block;font-size:12px;margin:8px}.CONNECTED{background:#0f0;color:#000}.CONNECTING{background:#ff0;color:#000}.DISCONNECTED{background:#f00}</style></head><body><div class="c"><img class="dp" src="${DP}" alt="DP"><h2>${botName}</h2><p style="color:#ff0040;font-size:13px;margin:0">🌹 Powered by Meri JAAN 🌹</p><div class="st ${status}">${status}</div>${status==='CONNECTED'?`<div style="color:#0f0"><h3>✅ CONNECTED</h3><p>Auto System Ready</p><img src="${DP}" style="width:70px;height:70px;border-radius:50%;margin-top:10px;border:2px solid #0f0"></div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923003719761" required><button>GET CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1><p style="color:#0f0;font-size:11px">WhatsApp > Linked Devices > Link with Phone Number</p></div>`:''}`}</div></body></html>`
}
app.get('/',(req,res)=>res.send(html()));

async function UNIVERSAL_RUN(cmdName, wa, m, args, prefix){
  const dir = path.join(__dirname,'commands');
  if(!fs.existsSync(dir)) return false;
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
  let target = files.find(f=>f.toLowerCase()===`${cmdName.toLowerCase()}.js`);
  if(!target){
    for(const file of files){
      try{
        const fullPath = path.join(dir,file);
        const mod = await import(`file://${fullPath}?t=${Date.now()}`);
        let handler = mod.default || mod;
        let aliases = handler.aliases || [];
        if(typeof aliases === 'string') aliases = [aliases];
        if(aliases.map(a=>String(a).toLowerCase()).includes(cmdName.toLowerCase())){target=file;break;}
      }catch{}
    }
  }
  if(!target) return false;
  const fullPath = path.join(dir,target);
  try{
    const mod = await import(`file://${fullPath}?t=${Date.now()}`);
    let handler = mod.default || mod;
    if(handler.execute){await handler.execute(wa,m,args,{prefix,config});return true;}
    if(typeof handler==='function'){await handler(wa,m,args,{conn:wa,prefix,config});return true;}
    if(handler.handler){await handler.handler(m,{conn:wa,args,prefix,config});return true;}
    if(handler.run){await handler.run(wa,m,args);return true;}
    return false;
  }catch(e){
    console.log(`❌ ERROR in ${target}:`, e.message);
    await wa.sendMessage(m.key.remoteJid,{text:`❌ Error in .${cmdName}: ${e.message}\n\n🌹 Powered by Meri JAAN`},{quoted:m});
    return true;
  }
}

async function startBot(num){
  try{
    if(num){lastNumber=num;cleanAuth();}
    if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
    const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();
    const wa = makeWASocket({version, logger, printQRInTerminal:false, auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,logger)}, browser:['Ubuntu','Chrome','20.0.04']});
    sock=wa; status='CONNECTING';
    wa.ev.on('creds.update', saveCreds);
    wa.ev.on('messages.upsert', async (upsert)=>{
      try{
        if(!upsert.messages||upsert.messages.length===0) return;
        const m=upsert.messages[0];
        if(!m.message) return;
        if(m.key.remoteJid==='status@broadcast') return;
        const text=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||"";
        if(!text) return;
        const prefix=config.prefix||".";
        if(!text.startsWith(prefix)) return;
        const parts=text.slice(prefix.length).trim().split(/ +/);
        const cmd=parts.shift().toLowerCase();
        const args=parts;
        if(!cmd) return;
        console.log(`CMD: .${cmd}`);
        await UNIVERSAL_RUN(cmd, wa, m, args, prefix);
      }catch(e){console.log("upsert error",e)}
    });
    wa.ev.on('connection.update',async (u)=>{
      const {connection,lastDisconnect}=u;
      if(connection==='open'){
        status='CONNECTED';pairCode=null;
        console.log("✅ CONNECTED - Auto DP: "+getConfigDP());
        setTimeout(async ()=>{
          try{
            const DP = getConfigDP();
            await wa.sendMessage(wa.user.id, { 
              image: { url: DP },
              caption: `╭─🌹─ *RANA FURQAN MD* ─🌹─╮
│ ✅ *BOT CONNECTED!*
│ 🤖 ONLINE - Auto System
│ ⚡ 94+ Commands Ready
│ 👑 Powered by Meri JAAN
╰─🌹──────────────🌹─╯

*.menu* likho commands dekho!`
            });
          }catch(e){console.log("msg error",e.message)}
        }, 3000);
      }
      else if(connection==='close'){status='DISCONNECTED';sock=null;if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut)setTimeout(()=>startBot(),3000);}
      else if(connection==='connecting')status='CONNECTING';
    });
    if(num){await new Promise(r=>setTimeout(r,3000));try{let code=await wa.requestPairingCode(num);code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');pairCode=code;pairTime=Date.now();}catch(e){console.log("pair err",e.message);}}
  }catch(e){status='DISCONNECTED';console.log("start err",e)}
}
app.post('/pair', async (req,res)=>{const n=normNum(req.body?.num);if(!n||n.length<11)return res.send('Invalid <a href="/">Back</a>');lastNumber=n;pairCode=null;status='CONNECTING';await startBot(n);for(let i=0;i<10;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}res.redirect('/');});
app.listen(PORT,()=>console.log('Running '+PORT+' - Auto DP from Config 🌹'));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();