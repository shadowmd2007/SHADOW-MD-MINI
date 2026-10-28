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
let sock = null; let status = 'DISCONNECTED'; let pairCode = null; let pairTime = 0; let lastNumber = '';
const commands = new Map();
app.use(express.urlencoded({ extended: true })); app.use(express.json());
function cleanAuth(){ try{if(fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR,{recursive:true,force:true});}catch{} try{fs.mkdirSync(AUTH_DIR,{recursive:true});}catch{} }
function normNum(v){ let n=String(v||'').replace(/\D/g,''); if(n.startsWith('0')) n='92'+n.slice(1); return n; }

// LOAD ALL 89 COMMANDS
function loadCommands(){
  commands.clear();
  const dir = path.join(__dirname,'commands');
  if(!fs.existsSync(dir)) return;
  for(const f of fs.readdirSync(dir)){
    if(!f.endsWith('.js')) continue;
    try{
      const fp = path.join(dir,f);
      delete require.cache?.[fp];
      // Dynamic import
      import(`file://${fp}?t=${Date.now()}`).then(m=>{
        const cmd = m.default || m;
        if(cmd && cmd.name) commands.set(cmd.name.toLowerCase(), cmd);
        if(cmd && cmd.aliases) cmd.aliases.forEach(a=>commands.set(a.toLowerCase(), cmd));
      }).catch(()=>{});
      // Also add by filename
      commands.set(f.replace('.js','').toLowerCase(), { filename: f });
    }catch{}
  }
  console.log(`✅ Loaded ${fs.readdirSync(dir).filter(f=>f.endsWith('.js')).length} command files`);
}

function html(){
  const valid = pairCode && Date.now()-pairTime < 65000;
  const dp = config.menuImage || config.botImage;
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>${config.botName}</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;font-family:Arial;color:#fff;padding:15px}.c{width:100%;max-width:420px;background:#111;border:2px solid #f00;border-radius:22px;padding:25px;text-align:center}input{width:100%;padding:14px;border-radius:12px;border:2px solid #f00;background:#000;color:#fff;font-size:18px;text-align:center;box-sizing:border-box;margin-top:12px}button{width:100%;padding:14px;border-radius:12px;border:0;background:red;color:#fff;font-weight:bold;margin-top:12px}.code{margin-top:18px;background:#000;border:2px dashed #0f0;border-radius:15px;padding:16px}.code h1{font-family:monospace;font-size:34px;letter-spacing:5px;color:#0f0;margin:10px 0}.st{padding:7px 16px;border-radius:20px;font-weight:bold;display:inline-block;font-size:12px;margin:8px}.CONNECTED{background:#0f0;color:#000}.CONNECTING{background:#ff0;color:#000}.DISCONNECTED{background:#f00}img.dp{width:115px;height:115px;border-radius:50%;border:3px solid #f00;object-fit:cover}</style></head><body><div class="c"><img class="dp" src="${dp}"><h2>${config.botName}</h2><div class="st ${status}">${status}</div>${status==='CONNECTED'?`<div style="color:#0f0"><h3>✅ CONNECTED - 89 Commands Active</h3></div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="923003719761" required><button>GET PAIRING CODE</button></form>${valid?`<div class="code"><h1>${pairCode}</h1></div>`:''}`}</div></body></html>`;
}
app.get('/',(req,res)=>res.send(html()));

async function startBot(num){
  try{
    if(num){ lastNumber=num; cleanAuth(); }
    if(!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR,{recursive:true});
    loadCommands();
    const {state, saveCreds} = await useMultiFileAuthState(AUTH_DIR);
    const {version} = await fetchLatestBaileysVersion();
    const wa = makeWASocket({ version, logger, printQRInTerminal:false, auth:{ creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys,logger) }, browser:['Ubuntu','Chrome','20.0.04'] });
    sock=wa; status='CONNECTING';
    wa.ev.on('creds.update', saveCreds);
    
    wa.ev.on('messages.upsert', async (upsert)=>{
      try{
        if(!upsert.messages || upsert.messages.length===0) return;
        const m = upsert.messages[0];
        if(!m.message) return;
        if(m.key.remoteJid==='status@broadcast') return;
        const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
        if(!text) return;
        const prefix = config.prefix || ".";
        if(!text.startsWith(prefix)) return;
        const args = text.slice(prefix.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const jid = m.key.remoteJid;
        console.log(`⚡ Command: ${cmdName} from ${jid}`);

        // Try to load and execute command file directly
        const cmdPath = path.join(__dirname,'commands',`${cmdName}.js`);
        if(fs.existsSync(cmdPath)){
          try{
            const mod = await import(`file://${cmdPath}?t=${Date.now()}`);
            const command = mod.default || mod;
            if(typeof command === 'function'){
              await command(wa, m, args, { prefix, commands });
            } else if(command && typeof command.execute === 'function'){
              await command.execute(wa, m, args, { prefix });
            } else if(command && typeof command.run === 'function'){
              await command.run(wa, m, args, { prefix });
            } else {
              // Fallback ping/alive
              if(cmdName==='ping') await wa.sendMessage(jid, { text: `*PONG!* 🏓\nSpeed: ${Date.now()%1000}ms\nBot: ${config.botName}` }, { quoted: m });
            }
          }catch(e){ console.log(`Error in ${cmdName}:`, e.message); await wa.sendMessage(jid, { text: `❌ Error in ${cmdName}: ${e.message}` }, { quoted: m }); }
        } else {
          // Check if command is alias or basic
          if(cmdName==='ping') await wa.sendMessage(jid, { text: `*PONG!* 🏓\nSpeed: ${Date.now()%1000}ms\nBot: ${config.botName}` }, { quoted: m });
          else if(cmdName==='alive') await wa.sendMessage(jid, { text: `*${config.botName} ALIVE!* ✅\nMode: ${config.mode}\nPrefix: ${prefix}\nOwner: ${config.ownerName}\nTotal: 89 Commands` }, { quoted: m });
        }
      }catch(e){ console.log("Handler Error:", e); }
    });

    wa.ev.on('connection.update', (u)=>{
      const {connection, lastDisconnect} = u;
      if(connection==='open'){ status='CONNECTED'; pairCode=null; console.log("✅ CONNECTED - 89 Commands Ready!"); }
      else if(connection==='close'){ status='DISCONNECTED'; sock=null; if(lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(()=>startBot(),3000); }
      else if(connection==='connecting') status='CONNECTING';
    });

    if(num){
      await new Promise(r=>setTimeout(r,3000));
      try{ let code = await wa.requestPairingCode(num); code=code.toUpperCase().replace(/[^A-Z0-9]/g,'').match(/.{1,4}/g).join('-'); pairCode=code; pairTime=Date.now(); }catch(e){ console.log("Pair Error:", e.message); }
    }
  }catch(e){ status='DISCONNECTED'; console.log("Start Error:", e); }
}
app.post('/pair', async (req,res)=>{ const n = normNum(req.body?.num); if(!n || n.length<11) return res.send('Invalid number <a href="/">Back</a>'); lastNumber=n; pairCode=null; status='CONNECTING'; await startBot(n); for(let i=0;i<10;i++){ if(pairCode) break; await new Promise(r=>setTimeout(r,1000)); } res.redirect('/'); });
app.listen(PORT, ()=>console.log('Bot Running on '+PORT));
if(fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length>0) startBot();