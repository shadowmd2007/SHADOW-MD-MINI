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
    const keys=['botImage','botPic','botImg','botDP','thumbnail','thumb','menuImage','ownerPic','pp','logo','image','botThumbnail','PROFILE_PIC'];
    for(const k of keys){
      if(config[k] && typeof config[k]==='string' && config[k].startsWith('http')) return config[k];
    }
    for(const val of Object.values(config)){
      if(typeof val==='string' && val.startsWith('http')) return val;
    }
  }catch{}
  return "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg";
}

function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP=getConfigDP();
  const botName=config.botName||config.botname||"RANA FURQAN MD";
  return`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${botName}</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px}.c{width:100%;max-width:420px;background:#111;border:2px solid #f00;border-radius:22px;padding:25px;text-align:center}.dp{width:120px;height:120px;border-radius:50%;border:3px solid #f00;object-fit:cover;margin-bottom:10px;box-shadow:0 0 25px #f00}input{width:100%;padding:14px;border-radius:12px;border:2px solid #f00;background:#000;color:#fff;font-size:18px;text-align:center;box-sizing:border-box;margin-top:12px}button{width:100%;padding:14px;border-radius:12px;border:0;background:red;color:#fff;font-weight:bold;margin-top:12px;font-size:16px}button:active{transform:scale(0.97)}.code{margin-top:18px;background:#000;border:2px dashed #0f0;border-radius:15px;padding:16px}.code h1{font-family:monospace;font-size:34px;letter-spacing:5px;color:#0f0;margin:10px 0}.st{padding:7px 16px;border-radius:20px;font-weight:bold;display:inline-block;font-size:12px;margin:10px}.CONNECTED{background:#0f0;color:#000}.CONNECTING{background:#ff0;color:#000}.DISCONNECTED{background:#f00}</style></head><body><div class="c"><img class="dp" src="${DP}" onerror="this.src='https://i.ibb.co/1p9q3bL8/rana-furqan.jpg'"><h2 style="margin:10px 0 0 0">${botName}</h2><p style="color:#ff0040;font-size:13px;margin:5px 0 0 0">🌹 Powered by Meri JAAN 🌹</p><div class="st ${status}">${status}</div>${status==='CONNECTED'?`<div style="color:#0f0"><h3>✅ BOT ONLINE</h3><p>94+ Commands Ready</p><p style="font-size:12px">.ping .menu try karo dusre number se</p></div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923003719761" required><button>GET CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1><p style="color:#0f0;font-size:11px">WhatsApp > Linked Devices > Link with Phone Number</p></div>`:''}`}</div></body></html>`
}

app.get('/',(req,res)=>res.send(html()));

// ✅ FIXED UNIVERSAL - NO CRASH
async function UNIVERSAL_RUN(cmdName, wa, m, args, prefix){
  const dir = path.join(__dirname,'commands');
  if(!fs.existsSync(dir)){
    console.log("❌ commands folder missing");
    return false;
  }
  const files = fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
  const targetFile = files.find(f=> f.toLowerCase() === `${cmdName.toLowerCase()}.js`);
  
  if(!targetFile){
    console.log(`❌ File not found: ${cmdName}.js`);
    return false;
  }
  
  const fullPath = path.join(dir, targetFile);
  console.log(`✅ Running: ${targetFile}`);
  
  try{
    const mod = await import(`file://${fullPath}?t=${Date.now()}`);
    const handler = mod.default || mod;
    
    if(handler?.execute){
      await handler.execute(wa, m, args, { prefix, config });
      return true;
    }
    if(typeof handler==='function'){
      await handler(wa, m, args, { conn: wa, prefix, config });
      return true;
    }
    if(handler?.handler){
      await handler.handler(m,{conn:wa,args,prefix,config});
      return true;
    }
    if(handler?.run){
      await handler.run(wa,m,args);
      return true;
    }
    
    await wa.sendMessage(m.key.remoteJid, { text: `❌ ${targetFile} mein execute() nahi hai` }, { quoted: m });
    return true;
    
  }catch(e){
    console.log(`❌ Error in ${targetFile}:`, e.message);
    console.log(e.stack);
    try{
      await wa.sendMessage(m.key.remoteJid, { text: `❌ .${cmdName} Error:\n${e.message}` }, { quoted: m });
    }catch{}
    return true;
  }
}

async function startBot(num){
  try{
    if(num){lastNumber=num;cleanAuth();}
    if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
    const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();
    
    const wa = makeWASocket({
      version, 
      logger, 
      printQRInTerminal:false, 
      auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,logger)}, 
      browser:['Ubuntu','Chrome','20.0.04'],
      markOnlineOnConnect: false,
      syncFullHistory: false,
      getMessage: async (key) => { return undefined; }
    });
    
    sock=wa; status='CONNECTING';
    wa.ev.on('creds.update', saveCreds);
    
    wa.ev.on('messages.upsert', async (upsert)=>{
      try{
        if(!upsert.messages||upsert.messages.length===0) return;
        const m=upsert.messages[0];
        if(!m.message) return;
        if(m.key.remoteJid==='status@broadcast') return;
        // Ignore Baileys decrypt error messages
        if(!m.message.conversation && !m.message.extendedTextMessage && !m.message.imageMessage && !m.message.videoMessage) return;
        
        const text=m.message.conversation||m.message.extendedTextMessage?.text||m.message.imageMessage?.caption||m.message.videoMessage?.caption||"";
        if(!text) return;
        const prefix=config.prefix||".";
        if(!text.startsWith(prefix)) return;
        const parts=text.slice(prefix.length).trim().split(/ +/);
        const cmd=parts.shift().toLowerCase();
        const args=parts;
        if(!cmd) return;
        console.log(`\n========== .${cmd} RECEIVED ==========`);
        await UNIVERSAL_RUN(cmd, wa, m, args, prefix);
      }catch(e){console.log("upsert error:", e.message)}
    });
    
    wa.ev.on('connection.update',async (u)=>{
      const {connection,lastDisconnect}=u;
      if(connection==='open'){
        status='CONNECTED';pairCode=null;
        console.log("✅ CONNECTED - DP: "+getConfigDP());
        setTimeout(async ()=>{
          try{
            const DP=getConfigDP();
            await wa.sendMessage(wa.user.id, { 
              image:{url:DP}, 
              caption:`┏━🌹 RANA FURQAN MD 🌹━┓\n┃ ✅ BOT CONNECTED!\n┃ 🤖 ONLINE - Auto System\n┃ ⚡ 94+ Commands Ready\n┃ 👑 Powered by Meri JAAN\n┗━━━━━━━━━━━━━━━┛\n\n*.menu* likho - Dusre number se try karo!`
            });
          }catch(e){console.log("connected msg error",e.message)}
        },2500);
      }
      else if(connection==='close'){
        status='DISCONNECTED';sock=null;
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log("Connection closed:", code);
        if(code!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000);
      }
      else if(connection==='connecting') status='CONNECTING';
    });
    
    if(num){
      await new Promise(r=>setTimeout(r,3500));
      try{
        let code=await wa.requestPairingCode(num);
        code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-');
        pairCode=code;pairTime=Date.now();
        console.log("Pair Code:", code);
      }catch(e){console.log("pair err",e.message);}
    }
  }catch(e){status='DISCONNECTED';console.log("start err",e)}
}

app.post('/pair', async (req,res)=>{
  const n=normNum(req.body?.num);
  if(!n||n.length<11)return res.send('Invalid Number <a href="/">Back</a>');
  lastNumber=n;pairCode=null;status='CONNECTING';
  await startBot(n);
  for(let i=0;i<12;i++){if(pairCode)break;await new Promise(r=>setTimeout(r,1000));}
  res.redirect('/');
});

app.listen(PORT,()=>console.log('Running '+PORT+' - FINAL FIXED - Powered by Meri JAAN 🌹'));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();