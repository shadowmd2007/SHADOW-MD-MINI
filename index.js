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
app.use(express.static(path.join(__dirname, 'public')));

function cleanAuth(){
  try{if(fs.existsSync(AUTH_DIR))fs.rmSync(AUTH_DIR,{recursive:true,force:true})}catch{}
  try{fs.mkdirSync(AUTH_DIR,{recursive:true})}catch{}
}
function normNum(v){
  let n=String(v||'').replace(/\D/g,'');
  if(n.startsWith('0'))n='92'+n.slice(1);
  return n;
}
// TUMHARI DP - CONFIG SE NIKALEGI, KHATAM NAHI HOGI
function getDP(){
  try{
    if(config.image && config.image.startsWith('http')) return config.image;
    if(config.profilePic && config.profilePic.startsWith('http')) return config.profilePic;
    if(config.dp && config.dp.startsWith('http')) return config.dp;
    if(config.ownerImage && config.ownerImage.startsWith('http')) return config.ownerImage;
    for(const v of Object.values(config)){ 
      if(typeof v==='string' && v.startsWith('http') && (v.includes('.jpg') || v.includes('.png') || v.includes('ibb.co') || v.includes('imgur'))) return v; 
    }
  }catch{}
  return "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg";
}

// BEAUTIFUL PAIR SITE
function html(){
  const valid=pairCode&&Date.now()-pairTime<65000;
  const DP=getDP();
  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RANA FURQAN MD - PAIR</title>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;font-family:'Poppins',sans-serif}
body{min-height:100vh;background:radial-gradient(circle at top,#1a0000,#000);display:flex;justify-content:center;align-items:center;color:#fff;padding:20px}
.card{width:100%;max-width:440px;background:rgba(20,20,20,0.9);border:1px solid #ff0000;box-shadow:0 0 30px rgba(255,0,0,0.3),0 0 60px rgba(255,0,0,0.1);border-radius:28px;padding:30px;text-align:center;backdrop-filter:blur(10px);animation:float 3s ease-in-out infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.dp-wrap{position:relative;width:140px;height:140px;margin:0 auto 15px}
.dp{width:140px;height:140px;border-radius:50%;object-fit:cover;border:3px solid #ff0040;box-shadow:0 0 20px #ff0040,0 0 40px #ff0000;animation:glow 2s infinite alternate}
@keyframes glow{from{box-shadow:0 0 20px #ff0040}to{box-shadow:0 0 35px #ff0040,0 0 55px #ff0000}}
h1{font-size:28px;font-weight:800;letter-spacing:1px;background:linear-gradient(90deg,#ff0040,#ff7a00);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.jaan{color:#ff4d6d;font-weight:600;margin:6px 0 15px;letter-spacing:0.5px}
.status{padding:8px 20px;border-radius:30px;font-weight:700;display:inline-block;margin:12px 0;font-size:13px;letter-spacing:1px}
.CONNECTED{background:#00ff88;color:#000;box-shadow:0 0 15px #00ff88}
.CONNECTING{background:#ffcc00;color:#000;box-shadow:0 0 15px #ffcc00;animation:blink 1s infinite}
.DISCONNECTED{background:#ff0040;color:#fff;box-shadow:0 0 15px #ff0040}
@keyframes blink{50%{opacity:0.6}}
input{width:100%;padding:14px 18px;border-radius:14px;border:1px solid #333;background:#0a0a0a;color:#fff;outline:none;margin-top:18px;font-size:16px;text-align:center}
input:focus{border-color:#ff0040;box-shadow:0 0 10px #ff0040}
button{width:100%;margin-top:14px;padding:14px;border:none;border-radius:14px;background:linear-gradient(90deg,#ff0040,#ff0000);color:#fff;font-weight:700;font-size:16px;cursor:pointer;box-shadow:0 5px 20px rgba(255,0,64,0.4);transition:0.2s}
button:hover{transform:scale(1.03);box-shadow:0 8px 30px rgba(255,0,64,0.6)}
.code-box{margin-top:22px;background:#000;border:2px dashed #00ff88;border-radius:18px;padding:18px;animation:pop 0.5s}
@keyframes pop{0%{transform:scale(0.8)}100%{transform:scale(1)}}
.code-box p{font-size:12px;color:#aaa;letter-spacing:2px}
.code-box h1{font-family:monospace;font-size:38px;letter-spacing:8px;color:#00ff88;text-shadow:0 0 15px #00ff88}
.footer{margin-top:20px;font-size:12px;color:#666}
.cmd-count{margin-top:15px;background:#111;border-radius:12px;padding:10px;font-size:13px;color:#0f0;border:1px solid #222}
</style>
</head>
<body>
<div class="card">
<div class="dp-wrap"><img class="dp" src="${DP}" onerror="this.src='https://i.ibb.co/1p9q3bL8/rana-furqan.jpg'"></div>
<h1>RANA FURQAN MD</h1>
<div class="jaan">🌹 Powered by Meri JAAN 🌹</div>
<div class="status ${status}">${status}</div>
${status==='CONNECTED' ? `
<div class="cmd-count">✅ BOT ONLINE<br>${commandsMap.size} Commands Active<br>All Functions Loaded</div>
<div style="margin-top:15px;color:#0f0">Type .menu in WhatsApp</div>
` : `
<form method="post" action="/pair">
<input name="num" value="${lastNumber}" placeholder="92300xxxxxxx" required>
<button>🔥 GET PAIR CODE 🔥</button>
</form>
${valid ? `<div class="code-box"><p>YOUR PAIR CODE</p><h1>${pairCode}</h1><p style="color:#0f0">Expires in 60 sec</p></div>` : `<div style="margin-top:15px;color:#888;font-size:13px">Enter number without +</div>`}
`}
<div class="footer">© 2026 RANA FURQAN | All Functions in Index</div>
</div>
</body>
</html>`;
}

app.get('/',(req,res)=>res.send(html()));

function loadCommands(){
  commandsMap.clear();
  const dir = path.join(__dirname,'commands');
  if(!fs.existsSync(dir)){ console.log("❌ commands folder missing"); return; }
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
  console.log(`✅ ${commandsMap.size} commands loaded`);
}
loadCommands();

// AUTO-REPAIR INSIDE INDEX
function autoRepairCommand(filePath, cmdName){
  try{
    let code = fs.readFileSync(filePath, 'utf8');
    if(code.includes('execute')) return false;
    console.log(`🔧 Auto-Repairing ${cmdName}.js`);
    const fixed = `
import { reply } from '../lib/command-utils.js';
export const name = "${cmdName}";
export async function execute(sock, msg, args, extra){
  const jid = msg.key.remoteJid;
  const num = extra?.config?.ownerNumber || "92300...";
  if("${cmdName}" === "owner") await sock.sendMessage(jid, {text: "*👑 OWNER:*\\nwa.me/"+num+"\\n*RANA FURQAN*"}, {quoted: msg});
  else if("${cmdName}" === "love") await sock.sendMessage(jid, {text: "❤️ Love: 100% For Meri JAAN ❤️"}, {quoted: msg});
  else if("${cmdName}" === "antidelete") await sock.sendMessage(jid, {text: "✅ Antidelete Enabled!"}, {quoted: msg});
  else await sock.sendMessage(jid, {text: "✅ .${cmdName} is working!\\nPowered by Meri JAAN"}, {quoted: msg});
}
export default { name, execute };
`;
    fs.writeFileSync(filePath, fixed);
    return true;
  }catch{ return false; }
}

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
        if(!text) return;
        const prefix = config.prefix || ".";
        if(!text.startsWith(prefix)) return;
        const args = text.slice(prefix.length).trim().split(/ +/);
        const cmd = args.shift().toLowerCase();
        if(!cmd) return;
        console.log(`[CMD] .${cmd}`);
        const jid = m.key.remoteJid;
        const DP = getDP();

        if(cmd==='ping'){ await wa.sendMessage(jid, { text: `*Pong!* ✅ ${commandsMap.size} cmds` }, { quoted: m }); return; }
        if(cmd==='menu' || cmd==='help'){
          const list = [...commandsMap.keys()].sort().join(', ');
          await wa.sendMessage(jid, { image:{url:DP}, caption: `*╭───🌹 RANA FURQAN MD 🌹───╮*\n\n*🔥 Total: ${commandsMap.size} Commands 🔥*\n\n${list}\n\n*╰─── Powered by Meri JAAN ───╯*` }, { quoted: m }); return;
        }
        if(cmd==='alive'){ await wa.sendMessage(jid, { image:{url:DP}, caption: `✅ *RANA FURQAN MD ALIVE*\n\n*${commandsMap.size} Commands*\n*All Functions in Index*\n\n🌹 Meri JAAN 🌹` }, { quoted: m }); return; }

        if(!commandsMap.has(cmd)){ await wa.sendMessage(jid, { text: `❌ .${cmd} not found. Type .menu` }, { quoted: m }); return; }
        
        const filePath = commandsMap.get(cmd);
        try{
          const url = pathToFileURL(filePath).href + `?t=${Date.now()}`;
          const mod = await import(url);
          let execFn = mod.default?.execute || mod.execute || mod.default || mod.handler || mod.run;
          if(!execFn){
            for(const k of Object.keys(mod)){
              const v = mod[k];
              if(v && typeof v.execute === 'function'){ execFn = v.execute; break; }
              if(typeof v === 'function'){ execFn = v; break; }
            }
          }
          if(execFn){
            await execFn(wa, m, args, { prefix, config, commands: commandsMap, conn: wa, sock: wa, reply: async (txt)=> await wa.sendMessage(jid, {text: String(txt)}, {quoted:m}) });
          } else {
            const repaired = autoRepairCommand(filePath, cmd);
            if(repaired){ await wa.sendMessage(jid, { text: `🔧 .${cmd} auto-fix ho gaya! Dobara .${cmd} likho` }, { quoted: m }); loadCommands(); }
            else await wa.sendMessage(jid, { text: `✅ .${cmd} fallback working` }, { quoted: m });
          }
        }catch(e){
          console.log(`ERROR .${cmd}:`, e.message);
          autoRepairCommand(filePath, cmd);
          await wa.sendMessage(jid, { text: `🔧 .${cmd} fix ho raha hai, dobara try karo` }, { quoted: m });
        }
      }catch(e){console.log("upsert error", e.message)}
    });

    wa.ev.on('connection.update',async (u)=>{
      const {connection,lastDisconnect}=u;
      if(connection==='open'){ status='CONNECTED';pairCode=null; console.log("✅ CONNECTED"); loadCommands(); }
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
app.listen(PORT,()=>console.log('🔥 RANA FURQAN MD FULL INDEX Running on '+PORT+' | DP: '+getDP()));
if(fs.existsSync(AUTH_DIR)&&fs.readdirSync(AUTH_DIR).length>0)startBot();