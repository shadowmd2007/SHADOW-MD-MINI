import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_NAME = 'RANA FURQAN MD';
const POWERED_BY = 'MERI JAAN';
const DP_URL = process.env.BOT_DP || 'https://files.catbox.moe/y04tbj.jpg';
const PORT = process.env.PORT || 3000;
const PREFIX = process.env.PREFIX || '.';

global.commands = new Map();
global.botStatus = { connected: false, loggedOut: false };

const app = express();
app.use(express.json());

// ===== BARA KHUBSURAT DESIGN - DP KE SATH =====
app.get('/', (req, res) => {
  const status = global.botStatus;
  if (status.loggedOut) {
    res.send(`
      <html><head><title>${BOT_NAME} - Logout</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{text-align:center;font-family:sans-serif;background:linear-gradient(135deg,#ff9a9e 0%,#fecfef 100%);padding:15px;margin:0;min-height:100vh}
        .box{background:white;padding:30px;border-radius:25px;max-width:450px;margin:40px auto;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
        .dp{width:140px;height:140px;border-radius:50%;border:5px solid #ff4757;object-fit:cover}
        h2{color:#ff4757} .btn{background:#25D366;color:white;padding:14px 30px;border-radius:12px;text-decoration:none;display:inline-block;margin-top:15px;font-weight:bold;font-size:16px}
      </style></head>
      <body><div class="box"><img src="${DP_URL}" class="dp"><h2>❌ ${BOT_NAME} LOGOUT</h2><p>Bot logout ho gaya hai</p><p>Auth delete ho gaya</p><a href="/code" class="btn">🔗 Pairing Code Lo</a><p style="margin-top:15px;font-size:13px;color:#666">POWERED BY ${POWERED_BY} 🌹</p></div></body></html>
    `);
  } else if (status.connected) {
    res.send(`
      <html><head><title>${BOT_NAME} - Connected</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{text-align:center;font-family:sans-serif;background:linear-gradient(135deg,#a8edea 0%,#fed6e3 100%);padding:15px;margin:0;min-height:100vh}
        .box{background:white;padding:30px;border-radius:25px;max-width:450px;margin:40px auto;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
        .dp{width:140px;height:140px;border-radius:50%;border:5px solid #25D366;object-fit:cover}
        h2{color:#25D366} .badge{background:#25D366;color:white;padding:8px 15px;border-radius:20px;font-size:14px;display:inline-block;margin:10px}
      </style></head>
      <body><div class="box"><img src="${DP_URL}" class="dp"><h2>🌹 ${BOT_NAME} CONNECTED 🌹</h2><p style="font-size:18px;font-weight:bold;color:#2f3542">✅ Bot Online Hai!</p><span class="badge">📦 ${global.commands.size} Commands Loaded</span><br><br><p>WhatsApp pe <b style="background:#eee;padding:5px 10px;border-radius:5px">${PREFIX}ping</b> bhejo</p><p>Personal + Group dono pe chalega!</p><p style="margin-top:20px;font-size:13px;color:#666">🌹 POWERED BY ${POWERED_BY} 🌹</p></div></body></html>
    `);
  } else {
    res.send(`
      <html><head><title>${BOT_NAME} - Starting</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{text-align:center;font-family:sans-serif;background:linear-gradient(135deg,#f6d365 0%,#fda085 100%);padding:15px;margin:0;min-height:100vh}
        .box{background:white;padding:30px;border-radius:25px;max-width:450px;margin:40px auto;box-shadow:0 10px 30px rgba(0,0,0,0.2)}
        .dp{width:140px;height:140px;border-radius:50%;border:5px solid #ffa502;object-fit:cover}
        h2{color:#ffa502}
      </style></head>
      <body><div class="box"><img src="${DP_URL}" class="dp"><h2>⏳ ${BOT_NAME} Starting...</h2><p>Bot start ho raha hai...</p><p>Thodi dair me refresh karo</p><a href="/code" style="color:#25D366;font-weight:bold">Pairing Code</a><p style="margin-top:15px;font-size:13px;color:#666">POWERED BY ${POWERED_BY}</p></div></body></html>
    `);
  }
});

// ===== BARA PAIRING CODE PAGE - JAISE PEHLE THA =====
app.get('/code', async (req, res) => {
  const num = req.query.num || req.query.number;
  if (!num) {
    return res.send(`
      <html><head><title>Pair ${BOT_NAME}</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{font-family:sans-serif;text-align:center;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);padding:15px;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .box{background:white;padding:35px;border-radius:25px;max-width:450px;width:100%;box-shadow:0 15px 35px rgba(0,0,0,0.3)}
        .dp{width:130px;height:130px;border-radius:50%;border:5px solid #667eea;object-fit:cover;margin-bottom:10px}
        h2{color:#2f3542;margin:15px 0} p{color:#57606f}
        input{padding:15px;width:85%;border-radius:12px;border:2px solid #dfe4ea;margin:15px 0;font-size:16px;text-align:center}
        input:focus{border-color:#667eea;outline:none}
        button{padding:14px 35px;background:#25D366;color:white;border:none;border-radius:12px;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 15px rgba(37,211,102,0.4)}
        button:hover{background:#128C7E} a{color:#667eea;text-decoration:none;font-weight:bold}
      </style></head>
      <body><div class="box">
        <img src="${DP_URL}" class="dp">
        <h2>🌹 Pair ${BOT_NAME} 🌹</h2>
        <p>Number likho (92 se start)</p>
        <p style="font-size:13px;color:#999">Example: 923003719761</p>
        <input id="num" placeholder="923003719761" value="923003719761"><br>
        <button onclick="if(document.getElementById('num').value){location.href='/code?num='+document.getElementById('num').value}else{alert('Number likho')}"">🔗 Get Code</button>
        <br><br><a href="/">🏠 Home</a>
        <p style="margin-top:20px;font-size:12px;color:#aaa">POWERED BY ${POWERED_BY} 🌹</p>
      </div></body></html>
    `);
  }
  try {
    if (!global.sockForPair) return res.send('<html><body style="text-align:center;padding:30px"><h2>Bot abhi start ho raha hai...</h2><p>10 second baad refresh karo</p><a href="/code">Back</a></body></html>');
    const cleanNum = num.replace(/[^0-9]/g,'');
    const code = await global.sockForPair.requestPairingCode(cleanNum);
    console.log(`CODE: ${code} for ${cleanNum}`);
    res.send(`
      <html><head><title>Code - ${BOT_NAME}</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{text-align:center;font-family:sans-serif;background:linear-gradient(135deg,#a8edea 0%,#fed6e3 100%);padding:15px;margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center}
        .box{background:white;padding:35px;border-radius:25px;max-width:450px;width:100%;box-shadow:0 15px 35px rgba(0,0,0,0.3)}
        .dp{width:120px;height:120px;border-radius:50%;border:5px solid #25D366}
        .code{font-size:32px;font-weight:bold;background:#2f3542;color:#fff;padding:15px 25px;border-radius:15px;letter-spacing:5px;margin:20px 0;display:inline-block}
        .num{color:#57606f}
      </style></head>
      <body><div class="box"><img src="${DP_URL}" class="dp"><h2>✅ Code Generated!</h2><p class="num">Number: ${cleanNum}</p><div class="code">${code}</div><p><b>WhatsApp pe jao:</b><br>Linked Devices > Link with phone number > Ye code dalo</p><p style="background:#ffeaa7;padding:10px;border-radius:8px;font-weight:bold">CODE: ${code}</p><br><a href="/" style="background:#25D366;color:white;padding:12px 25px;border-radius:10px;text-decoration:none">Home</a></div></body></html>
    `);
  } catch(e) {
    res.send(`<html><body style="text-align:center;padding:30px"><h2 style="color:red">Error: ${e.message}</h2><a href="/code">Try Again</a> | <a href="/">Home</a></body></html>`);
  }
});

app.listen(PORT, () => console.log(`🌐 ${BOT_NAME} Live on ${PORT}`));

async function loadCommands() {
  const p = path.join(__dirname, 'commands');
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  const files = fs.readdirSync(p).filter(f=>f.endsWith('.js'));
  for(const file of files){
    try{
      const mod = await import(`file://${path.join(p,file)}?update=${Date.now()}`);
      const cmd = mod.command || mod.default;
      if(cmd?.name){
        global.commands.set(cmd.name.toLowerCase(), cmd);
        if(cmd.aliases) cmd.aliases.forEach(a=>global.commands.set(a.toLowerCase(), cmd));
      }
    }catch(e){console.log(`❌ ${file}: ${e.message}`)}
  }
  console.log(`📦 ${global.commands.size} Commands Loaded`);
}

async function startBot(){
  const {state, saveCreds} = await useMultiFileAuthState('./auth');
  const {version} = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: {creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'}))},
    logger: P({level:'silent'}),
    printQRInTerminal: false,
    browser: ["Ubuntu","Chrome","20.0.04"],
    markOnlineOnConnect: true
  });
  global.sockForPair = sock;
  await loadCommands();
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({connection, lastDisconnect})=>{
    if(connection==='close'){
      global.botStatus.connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log('Connection closed, code:', code);
      if(code === DisconnectReason.loggedOut){
        console.log('❌ LOGGED OUT - Deleting auth');
        global.botStatus.loggedOut = true;
        if(fs.existsSync('./auth')) fs.rmSync('./auth', {recursive:true, force:true});
      } else {
        global.botStatus.loggedOut = false;
        await delay(3000);
        startBot();
      }
    } else if(connection==='open'){
      global.botStatus.connected = true;
      global.botStatus.loggedOut = false;
      console.log(`✅ ${BOT_NAME} CONNECTED - ${global.commands.size} Commands Ready ✅`);
    }
  });

  // ===== YAHAN SE FIX KIYA HAI - BAQII SAME HAI =====
  sock.ev.on('messages.upsert', async (upsert)=>{
    try{
      if(upsert.type !== 'notify') return;
      const msg = upsert.messages?.[0];
      if(!msg || !msg.message) return;
      // Message yourself pe bhi kaam karega - fromMe check nahi
      let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
      if(!text) return;
      text = text.trim();
      if(!text.startsWith(PREFIX)) return;
      const from = msg.key.remoteJid;
      const args = text.slice(PREFIX.length).trim().split(/ +/);
      const cmdName = args.shift().toLowerCase();
      const command = global.commands.get(cmdName);
      if(!command) return;
      console.log(`📩 ${PREFIX}${cmdName} from ${from} | fromMe=${msg.key.fromMe}`);
      const ctx = {
        sock,
        jid: from,
        m: msg,
        args,
        prefix: PREFIX,
        sender: from.endsWith('@g.us') ? msg.key.participant : from,
        isGroup: from.endsWith('@g.us'),
        // Reply fix - Message yourself pe quoted fail hota tha, ab fix hai
        reply: async (txt) => {
          try {
            return await sock.sendMessage(from, { text: txt }, { quoted: msg });
          } catch {
            return await sock.sendMessage(from, { text: txt });
          }
        }
      };
      await command.run(ctx);
      console.log(`✅ Executed: ${cmdName}`);
    }catch(e){console.log('Message Error:', e.message)}
  });
}
startBot();