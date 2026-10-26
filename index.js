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

// ===== WEBSITE - AB SACH BATAYEGA =====
app.get('/', (req, res) => {
  const status = global.botStatus;
  if (status.loggedOut) {
    res.send(`
      <html><head><title>${BOT_NAME} - Logout</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{text-align:center;font-family:sans-serif;background:#ffe6e6;padding:20px}.box{background:white;padding:25px;border-radius:20px;max-width:420px;margin:30px auto}.dp{width:100px;height:100px;border-radius:50%}</style>
      </head><body><div class="box"><img src="${DP_URL}" class="dp"><h2 style="color:red">❌ ${BOT_NAME} LOGOUT HO GAYA</h2><p>Auth delete ho gaya, dobara pair karo</p><a href="/code" style="background:#25D366;color:white;padding:12px 25px;border-radius:10px;text-decoration:none;display:inline-block;margin-top:10px">Pairing Code Lo</a></div></body></html>
    `);
  } else if (status.connected) {
    res.send(`
      <html><head><title>${BOT_NAME} - Connected</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>body{text-align:center;font-family:sans-serif;background:#e6ffe6;padding:20px}.box{background:white;padding:25px;border-radius:20px;max-width:420px;margin:30px auto}.dp{width:100px;height:100px;border-radius:50%;border:4px solid #25D366}</style>
      </head><body><div class="box"><img src="${DP_URL}" class="dp"><h2 style="color:green">🌹 ${BOT_NAME} CONNECTED 🌹</h2><p>✅ Bot Online Hai!</p><p>WhatsApp pe <b>${PREFIX}ping</b> bhejo</p><p>Total Commands: ${global.commands.size}</p></div></body></html>
    `);
  } else {
    res.send(`
      <html><head><title>${BOT_NAME} - Starting</title><meta name="viewport" content="width=device-width, initial-scale=1"></head>
      <body style="text-align:center;font-family:sans-serif;padding:30px"><h2>⏳ ${BOT_NAME} Starting...</h2><p>Thodi dair me refresh karo</p><a href="/code">Pairing Code</a></body></html>
    `);
  }
});

app.get('/code', async (req, res) => {
  const num = req.query.num || req.query.number;
  if (!num) {
    return res.send(`
      <html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>body{font-family:sans-serif;text-align:center;padding:20px}.box{background:white;padding:20px;border-radius:15px;max-width:400px;margin:20px auto;box-shadow:0 2px 10px rgba(0,0,0,0.1)}input{padding:12px;width:80%;border-radius:8px;border:1px solid #ccc;margin:10px}button{padding:12px 25px;background:#25D366;color:white;border:none;border-radius:8px}</style></head>
      <body><div class="box"><h2>Pair ${BOT_NAME}</h2><p>Number likho (92 se start)</p><input id="num" placeholder="923003719761"><br><button onclick="location.href='/code?num='+document.getElementById('num').value">Get Code</button><br><br><a href="/">Home</a></div></body></html>
    `);
  }
  try {
    if (!global.sockForPair) return res.send('Bot abhi start ho raha hai, 10 sec baad try karo <a href="/code">Back</a>');
    const code = await global.sockForPair.requestPairingCode(num.replace(/[^0-9]/g,''));
    console.log(`CODE: ${code} for ${num}`);
    res.send(`<html><body style="text-align:center;font-family:sans-serif;padding:30px"><h1>CODE: ${code}</h1><p>Number: ${num}</p><p>WhatsApp > Linked Devices > Link with phone number pe ye code dalo</p><p>Code: <b>${code}</b></p><a href="/">Home</a></body></html>`);
  } catch(e) {
    res.send(`Error: ${e.message} <br><a href="/code">Try Again</a>`);
  }
});

app.listen(PORT, () => console.log(`🌐 Live on ${PORT}`));

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
        console.log('Reconnecting in 3 sec...');
        await delay(3000);
        startBot();
      }
    } else if(connection==='open'){
      global.botStatus.connected = true;
      global.botStatus.loggedOut = false;
      console.log(`✅✅ ${BOT_NAME} CONNECTED - ${global.commands.size} Commands Ready ✅✅`);
    }
  });

  // UNIVERSAL HANDLER - PERSONAL + GROUP + OTHERS SAB PE CHALEGA
  sock.ev.on('messages.upsert', async (upsert)=>{
    try{
      if(upsert.type !== 'notify') return;
      const msg = upsert.messages?.[0];
      if(!msg || !msg.message) return;
      let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
      if(!text) return;
      text = text.trim();
      if(!text.startsWith(PREFIX)) return;

      const from = msg.key.remoteJid;
      const args = text.slice(PREFIX.length).trim().split(/ +/);
      const cmdName = args.shift().toLowerCase();
      const command = global.commands.get(cmdName);
      if(!command) {
        console.log(`❌ Not found: ${cmdName}`);
        return;
      }
      console.log(`📩 ${PREFIX}${cmdName} from ${from} | fromMe=${msg.key.fromMe}`);

      const ctx = {
        sock,
        jid: from,
        m: msg,
        args,
        prefix: PREFIX,
        sender: from.endsWith('@g.us') ? msg.key.participant : from,
        isGroup: from.endsWith('@g.us'),
        reply: async (txt) => await sock.sendMessage(from, { text: txt }, { quoted: msg })
      };
      await command.run(ctx);
      console.log(`✅ Executed: ${cmdName}`);
    }catch(e){console.log('Message Error:', e.message)}
  });
}
startBot();