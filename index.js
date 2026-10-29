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
let commandsMap = new Map();

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
function getDP(){
  try{ for(const v of Object.values(config)){ if(typeof v==='string' && v.startsWith('http')) return v; } }catch{}
  return "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg";
}
function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP=getDP();
  return`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA FURQAN MD</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px}.c{width:100%;max-width:420px;background:#111;border:2px solid #f00;border-radius:22px;padding:25px;text-align:center}.dp{width:120px;height:120px;border-radius:50%;border:3px solid #f00;object-fit:cover}.st{padding:7px 16px;border-radius:20px;font-weight:bold;display:inline-block;margin:10px}.CONNECTED{background:#0f0;color:#000}.CONNECTING{background:#ff0;color:#000}.DISCONNECTED{background:#f00}.code{margin-top:18px;background:#000;border:2px dashed #0f0;border-radius:15px;padding:16px}.code h1{font-family:monospace;font-size:34px;letter-spacing:5px;color:#0f0}</style></head><body><div class="c"><img class="dp" src="${DP}"><h2>RANA FURQAN MD</h2><p style="color:#ff0040">🌹 Powered by Meri JAAN 🌹</p><div class="st ${status}">${status}</div>${status==='CONNECTED'?`<div style="color:#0f0"><h3>✅ BOT ONLINE</h3><p>${commandsMap.size} Commands Loaded</p></div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923003719761" required><button>GET CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1></div>`:''}`}</div></body></html>`
}
app.get('/',(req,res)=>res.send(html()));

// LOAD ALL 89 COMMANDS
function loadCommands(){
  commandsMap.clear();
  const dir = path.join(__dirname,'commands');
  if(!fs.existsSync(dir)){ console.log("❌ commands folder missing"); return; }
  const scan = (d) => {
    for(const f of fs.readdirSync(d)){
      const p = path.join(d,f);
      if(fs.statSync(p).isDirectory()) scan(p);
      else if(f.endsWith('.js')) commandsMap.set(f.replace('.js','').toLowerCase(), p);
    }
  };
  scan(dir);
  console.log(`✅ ${commandsMap.size} commands loaded: ${[...commandsMap.keys()].slice(0,10).join(', ')}...`);
}
loadCommands();

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
        const m = upsert.messages?.[0];
        if(!m?.message) return;
        if(m.key.remoteJid==='status@broadcast') return;
        
        let text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
        if(!text) text = m.message.ephemeralMessage?.message?.extendedTextMessage?.text || "";
        if(!text) return;
        
        const prefix = config.prefix || ".";
        if(!text.startsWith(prefix)) return;
        
        const args = text.slice(prefix.length).trim().split(/ +/);
        const cmd = args.shift().toLowerCase();
        if(!cmd) return;

        console.log(`\n[CMD] .${cmd} by ${m.key.remoteJid}`);
        const jid = m.key.remoteJid;
        const DP = getDP();

        if(cmd==='ping' || cmd==='p'){
          const s = Date.now();
          await wa.sendMessage(jid, { text: `*Pong!* ${Date.now()-s}ms\n✅ 89 Commands Active` }, { quoted: m });
          return;
        }
        if(cmd==='menu' || cmd==='help' || cmd==='list'){
          const list = [...commandsMap.keys()].join(', ');
          await wa.sendMessage(jid, { image:{url:DP}, caption: `*╭─🌹 RANA FURQAN MD 🌹─╮*\n\n*Total Commands: ${commandsMap.size}*\n\n${list}\n\n╰─ Powered by Meri JAAN ─╯` }, { quoted: m });
          return;
        }
        if(cmd==='alive' || cmd==='bot'){
          await wa.sendMessage(jid, { text: `✅ *ALIVE - ${commandsMap.size} commands*\n\n.All working now!` }, { quoted: m });
          return;
        }

        if(!commandsMap.has(cmd)){
          await wa.sendMessage(jid, { text: `❌ .${cmd} not found\nType .menu` }, { quoted: m });
          return;
        }
        
        const filePath = commandsMap.get(cmd);
        try{
          const url = pathToFileURL(filePath).href + `?t=${Date.now()}`;
          const mod = await import(url);
          
          // ---- ULTRA FINDER - HAR EXPORT CHALEGA ----
          let execFn = null;
          if(mod.default?.execute) execFn = mod.default.execute;
          else if(typeof mod.default === 'function') execFn = mod.default;
          else if(mod.execute) execFn = mod.execute;
          else if(typeof mod === 'function') execFn = mod;
          else if(mod.handler) execFn = mod.handler;
          else if(mod.run) execFn = mod.run;
          else if(mod.default?.handler) execFn = mod.default.handler;
          else if(mod.default?.run) execFn = mod.default.run;
          
          // Search in all exports
          if(!execFn){
            for(const k of Object.keys(mod)){
              const v = mod[k];
              if(v && typeof v.execute === 'function'){ execFn = v.execute; break; }
              if(v && typeof v === 'function' && k.toLowerCase() !== 'name'){ execFn = v; break; }
            }
          }

          if(execFn){
            await execFn(wa, m, args, { 
              prefix, config, commands: commandsMap, conn: wa, sock: wa,
              reply: async (txt) => await wa.sendMessage(jid, { text: String(txt) }, { quoted: m })
            });
          } else {
            console.log(`❌ No exec in ${cmd}.js Keys:`, Object.keys(mod));
            await wa.sendMessage(jid, { text: `❌ .${cmd}.js me execute nahi mila. File check karo.` }, { quoted: m });
          }
        }catch(e){
          console.log(`ERROR .${cmd}:`, e.message, e.stack?.split('\n')[0]);
          await wa.sendMessage(jid, { text: `❌ Error .${cmd}: ${e.message}` }, { quoted: m });
        }

      }catch(e){console.log("upsert error", e.message)}
    });

    wa.ev.on('connection.update',async (u)=>{
      const {connection,lastDisconnect}=u;
      if(connection==='open'){
        status='CONNECTED';pairCode=null;
        console.log("✅ CONNECTED - BOT READY");
        loadCommands();
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
app.listen(PORT,()=>console.log('Running on '+PORT+' - FULL FIXED 89 CMDS'));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();