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
app.use(express.urlencoded({ extended: true }));

let sockInstance = null;

// --- Pairing Page HTML - POWERED BY MERI JAAN ---
const pairHTML = `
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>RANA FURQAN MD - PAIR</title>
<style>
body{background:#111;color:#fff;font-family:sans-serif;text-align:center;padding:20px}
.card{background:#1e1e1e;padding:20px;border-radius:15px;max-width:400px;margin:auto;border:1px solid #333}
img{width:120px;height:120px;border-radius:50%;border:3px solid #a855f7;margin:10px}
input{width:90%;padding:12px;margin:10px 0;border-radius:8px;border:none;background:#2a2a2a;color:#fff}
button{background:#a855f7;color:#fff;padding:12px 25px;border:none;border-radius:8px;font-weight:bold;cursor:pointer;width:95%}
h2{color:#a855f7}
.code{font-size:28px;letter-spacing:5px;background:#000;padding:15px;border-radius:10px;margin:15px 0;border:1px dashed #a855f7}
</style></head><body>
<div class="card">
<img src="https://files.catbox.moe/y04tbj.jpg" alt="RANA">
<h2>🌹 RANA FURQAN MD 🌹</h2>
<p>POWERED BY MERI JAAN</p>
<input type="text" id="num" placeholder="9230XXXXXXX - Number likho (without +)">
<button onclick="getCode()">GET PAIR CODE</button>
<div id="result"></div>
<p style="margin-top:20px;font-size:12px;color:#888">Commands Loaded: 108<br>BOT IS RUNNING</p>
</div>
<script>
async function getCode(){
 let n=document.getElementById('num').value.replace(/[^0-9]/g,'');
 if(!n){alert('Number likho Meri JAAN');return;}
 document.getElementById('result').innerHTML='Generating...';
 let r=await fetch('/code?number='+n);
 let d=await r.json();
 if(d.code){document.getElementById('result').innerHTML='<div class=code>'+d.code+'</div><p>WhatsApp > Linked Devices > Link with phone number pe ye code lagao!</p>';}
 else{document.getElementById('result').innerHTML='<p style=color:red>'+ (d.error||'Error')+'</p>';}
}
</script></body></html>
`;

app.get('/', (req, res) => res.send(pairHTML));

app.get('/code', async (req, res) => {
  let num = req.query.number;
  if (!num) return res.json({ error: 'Number do Meri JAAN' });
  num = num.replace(/[^0-9]/g,'');
  try {
    const { state } = await useMultiFileAuthState('auth_info_baileys');
    const tempSock = makeWASocket({
      auth: state,
      logger: P({ level: 'silent' }),
      browser: Browsers.macOS('Desktop'),
      printQRInTerminal: false
    });
    await delay(3000);
    let code = await tempSock.requestPairingCode(num);
    code = code?.match(/.{1,4}/g)?.join('-') || code;
    res.json({ code });
  } catch (e) {
    res.json({ error: e.message });
  }
});

app.get('/status', (req,res)=> res.send(`<h1>🌹 RANA FURQAN MD ACTIVE 🌹</h1><p>POWERED BY MERI JAAN</p><p>Commands: ${global.commands.size}</p>`));

app.listen(PORT, () => console.log(`✅ WEB + PAIR SERVER ON ${PORT}`));

// --- Bot Commands Loading ---
async function loadCommands() {
  const cmdPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(cmdPath)) return;
  const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const mod = await import(`file://${path.join(cmdPath, file)}?t=${Date.now()}`);
      const cmd = mod.command || mod.default || mod;
      if (!cmd?.name) continue;
      global.commands.set(cmd.name.toLowerCase(), cmd);
      if (cmd.aliases) for (const a of cmd.aliases) global.commands.set(a.toLowerCase(), cmd);
    } catch (e) { console.log(`❌ ${file}: ${e.message}`); }
  }
  console.log(`✅ TOTAL ${global.commands.size} COMMANDS`);
}

async function startBot() {
  await loadCommands();
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: Browsers.macOS('Desktop'), syncFullHistory: false, markOnlineOnConnect: false, getMessage: async () => undefined });
  sockInstance = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
    if (u.connection === 'open') console.log('✅ BOT CONNECTED - POWERED BY MERI JAAN');
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;
    const from = msg.key.remoteJid;
    if (from.includes('broadcast')) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
    if (!text.startsWith(PREFIX)) return;
    const args = text.slice(PREFIX.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = global.commands.get(cmdName);
    if (!cmd) return;
    await cmd.run({ sock, jid: from, from, m: msg, msg, args, text: args.join(' '), prefix: PREFIX, isGroup: from.endsWith('@g.us'), sender: msg.key.participant || from, reply: async (t) => sock.sendMessage(from, { text: t }, { quoted: msg }).catch(()=>sock.sendMessage(from, {text: t})) });
  });
}
startBot();