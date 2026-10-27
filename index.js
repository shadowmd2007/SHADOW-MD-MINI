import makeWASocket, { useMultiFileAuthState, Browsers, DisconnectReason, delay } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import P from 'pino';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

global.commands = new Map();
const PREFIX = process.env.PREFIX || '.';
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json());

let sock = null;
let authState = null;
let saveCredsGlobal = null;

// --- Pair HTML ---
const pairHTML = `
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<title>RANA FURQAN MD</title>
<style>body{background:#111;color:#fff;text-align:center;font-family:sans-serif;padding:20px}
.card{background:#1e1e1e;padding:25px;border-radius:20px;max-width:380px;margin:auto;border:1px solid #a855f7}
img{width:130px;height:130px;border-radius:50%;border:3px solid #a855f7}
input{width:90%;padding:13px;margin:15px 0;border-radius:10px;border:none;background:#2a2a2a;color:#fff;font-size:16px}
button{background:#a855f7;color:#fff;padding:13px 20px;border:none;border-radius:10px;font-weight:bold;width:95%;font-size:16px}
.code{font-size:30px;letter-spacing:4px;background:#000;padding:18px;border-radius:12px;margin:15px 0;border:1px dashed #a855f7}</style>
</head><body><div class="card">
<img src="https://files.catbox.moe/y04tbj.jpg">
<h2 style="color:#a855f7">🌹 RANA FURQAN MD 🌹</h2>
<p>POWERED BY MERI JAAN</p>
<input id="num" placeholder="9230XXXXXXX">
<button onclick="getCode()">GET PAIR CODE</button>
<div id="result"></div>
<p style="font-size:12px;color:#888;margin-top:20px">Commands: 108 | BOT RUNNING</p>
</div>
<script>
async function getCode(){
 let n=document.getElementById('num').value.replace(/[^0-9]/g,'');
 if(n.length<11){alert('Sahi number likho Meri JAAN');return;}
 document.getElementById('result').innerHTML='Wait Meri JAAN... 5 sec';
 let r=await fetch('/code?number='+n);
 let d=await r.json();
 if(d.code){document.getElementById('result').innerHTML='<div class=code>'+d.code+'</div><p>WhatsApp > Linked Devices > Link with phone number</p>';}
 else document.getElementById('result').innerHTML='<p style=color:red>'+d.error+'</p>';
}
</script></body></html>
`;

app.get('/', (req,res)=>res.send(pairHTML));

app.get('/code', async (req,res)=>{
  let num = (req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number do'});
  try {
    if(!sock){
      // Agar bot start nahi hua to pehle auth lo
      const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
      authState = state; saveCredsGlobal = saveCreds;
      sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: Browsers.macOS('Desktop'), printQRInTerminal:false });
      sock.ev.on('creds.update', saveCreds);
      await delay(2000);
    }
    // IMPORTANT: Single socket se code mango - yahi fix hai
    await delay(1000);
    let code = await sock.requestPairingCode(num);
    code = code?.match(/.{1,4}/g)?.join('-') || code;
    console.log(`✅ PAIR CODE ${code} for ${num}`);
    res.json({code});
  } catch(e){
    console.log('Pair Error:', e.message);
    res.json({error: 'Try again after 1 min: '+e.message});
  }
});

app.listen(PORT, ()=>console.log(`✅ SERVER ON ${PORT}`));

// --- Commands ---
async function loadCommands(){
  const p = path.join(__dirname,'commands');
  if(!fs.existsSync(p)) return;
  for(const f of fs.readdirSync(p).filter(x=>x.endsWith('.js'))){
    try{
      const m = await import(`file://${path.join(p,f)}?t=${Date.now()}`);
      const c = m.command||m.default||m;
      if(!c?.name) continue;
      global.commands.set(c.name.toLowerCase(), c);
      if(c.aliases) for(const a of c.aliases) global.commands.set(a.toLowerCase(), c);
    }catch(e){ console.log(`❌ ${f}: ${e.message}`); }
  }
  console.log(`✅ ${global.commands.size} COMMANDS`);
}

async function startBot(){
  await loadCommands();
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  authState = state; saveCredsGlobal = saveCreds;
  sock = makeWASocket({ auth: state, logger: P({level:'silent'}), browser: Browsers.macOS('Desktop'), syncFullHistory:false, markOnlineOnConnect:false, getMessage: async()=>undefined });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u)=>{
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
    if(u.connection==='open') console.log('✅ BOT CONNECTED - POWERED BY MERI JAAN');
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const msg = messages[0]; if(!msg?.message) return;
    const from = msg.key.remoteJid; if(from.includes('broadcast')) return;
    const text = msg.message.conversation||msg.message.extendedTextMessage?.text||msg.message.imageMessage?.caption||'';
    if(!text.startsWith(PREFIX)) return;
    const args = text.slice(PREFIX.length).trim().split(/ +/);
    const cmd = global.commands.get(args.shift().toLowerCase()); if(!cmd) return;
    await cmd.run({ sock, jid: from, from, m: msg, msg, args, text: args.join(' '), prefix: PREFIX, isGroup: from.endsWith('@g.us'), sender: msg.key.participant||from, reply: async(t)=>sock.sendMessage(from,{text:t},{quoted:msg}).catch(()=>sock.sendMessage(from,{text:t})) });
  });
}
startBot();