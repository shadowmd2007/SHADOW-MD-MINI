import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_NAME = 'RANA FURQAN MD';
const POWERED_BY = 'MERI JAAN';
const DP_URL = process.env.BOT_DP || 'https://files.catbox.moe/y04tbj.jpg';
const PORT = process.env.PORT || 3000;
const PREFIX = process.env.PREFIX || '.';

global.messageStore = new Map();
global.commands = new Map();
global.pairSock = null;

const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html><head><title>${BOT_NAME}</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{text-align:center;font-family:sans-serif;background:#f0f2f5;padding:10px}.box{background:white;padding:30px;border-radius:20px;max-width:420px;margin:30px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}.dp{width:130px;height:130px;border-radius:50%;border:5px solid #25D366;object-fit:cover}input{padding:14px;width:85%;border-radius:10px;border:1px solid #ccc;margin:10px;font-size:16px}button{padding:14px 30px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold;font-size:16px;cursor:pointer}</style>
    </head><body><div class="box">
    <img src="${DP_URL}" class="dp"><h1>🌹 ${BOT_NAME} 🌹</h1><p>🌹 POWERED BY ${POWERED_BY} 🌹</p><hr>
    <h3>Pair Your Number</h3><form action="/code" method="get"><input type="text" name="number" placeholder="92300XXXXXXXX" required><br><button type="submit">GET PAIR CODE</button></form>
    <p style="font-size:11px;color:#888">Number bina + ke dalo</p>
    </div></body></html>
  `);
});

app.get('/code', async (req, res) => {
  let num = req.query.number?.replace(/[^0-9]/g, '');
  if (!num) return res.send('<h2 style="text-align:center">Number dalo Meri JAAN! <a href="/">Back</a></h2>');

  try {
    // PURANA AUTH DELETE KARO - YAHI MAIN FIX HAI
    if (fs.existsSync('./auth') && !global.pairSock) {
        // check if already registered
        try {
            const creds = JSON.parse(fs.readFileSync('./auth/creds.json'));
            if (!creds.registered) {
                fs.rmSync('./auth', { recursive: true, force: true });
                console.log('Old unregistered auth deleted');
            }
        } catch {
            fs.rmSync('./auth', { recursive: true, force: true });
        }
    }

    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: [BOT_NAME, 'Chrome', '1.0.0']
    });
    
    sock.ev.on('creds.update', saveCreds);
    global.pairSock = sock;

    await new Promise(r => setTimeout(r, 3000));

    if (!sock.authState.creds.registered) {
      let code = await sock.requestPairingCode(num);
      code = code?.match(/.{1,4}/g)?.join('-') || code;

      console.log(`🌹 PAIR CODE FOR ${num}: ${code} - 1 MIN VALID`);

      return res.send(`
        <html><head><title>Pair Code</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body{text-align:center;font-family:sans-serif;background:#f0f2f5;padding:15px}
          .box{background:white;padding:25px;border-radius:20px;max-width:420px;margin:30px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}
          .dp{width:110px;height:110px;border-radius:50%;border:4px solid #25D366;object-fit:cover}
          .code{background:#111;color:#25D366;padding:18px 10px;border-radius:15px;margin:20px auto;font-size:30px;font-weight:bold;letter-spacing:2px;word-break:break-all;max-width:100%;box-sizing:border-box}
          button{padding:12px 25px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer}
          .timer{color:red;font-weight:bold;margin:10px;font-size:18px}
        </style>
        </head><body><div class="box">
          <img src="${DP_URL}" class="dp"><h2>🌹 ${BOT_NAME} 🌹</h2>
          <h3>Pair Code for ${num}</h3>
          <div class="code">${code}</div>
          <div class="timer" id="timer">Valid: 60 seconds</div>
          <p><b>WhatsApp > Linked Devices > Link with Phone Number</b></p>
          <p style="font-size:12px;color:gray">Code ko 15 second ke andar dalo!</p>
          <p><b>🌹 POWERED BY ${POWERED_BY} 🌹</b></p>
          <a href="/"><button>Back to Home</button></a>
        </div>
        <script>let t=60;const el=document.getElementById('timer');setInterval(()=>{t--;el.innerText='Valid: '+t+' seconds';if(t<=0)el.innerText='Expired - Get New Code';},1000);</script>
        </body></html>
      `);
    } else {
      res.send(`<h2 style="text-align:center">Already Paired Meri JAAN! Bot Connected hai!<br><a href="/">Home</a></h2>`);
    }
  } catch(e) {
    console.log('Pair Error: ' + e.message);
    res.send(`<h3 style="text-align:center">Error: ${e.message}<br><a href="/">Back</a></h3>`);
  }
});

app.listen(PORT, () => console.log(`🌐 ${BOT_NAME} Live on ${PORT}`));

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  console.log(`📂 Found ${files.length} commands`);
  for (const file of files) {
    try {
      const filePath = path.join(commandsPath, file);
      const mod = await import(`file://${filePath}?update=${Date.now()}`);
      const cmd = mod.command || mod.default;
      if (cmd && cmd.name) {
        global.commands.set(cmd.name.toLowerCase(), cmd);
        if (cmd.aliases) for (const a of cmd.aliases) global.commands.set(a.toLowerCase(), cmd);
      }
    } catch (e) { console.log(`❌ ${file}: ${e.message} - Skipped`); }
  }
}
async function onMessage(sock, upsert) { 
  try {
    const msg = upsert.messages?.[0];
    if (!msg || !msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
    if (!text) return;
    if (!text.startsWith(PREFIX)) return;
    const args = text.slice(PREFIX.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const command = global.commands.get(cmdName);
    if (!command) return;
    const ctx = { sock, jid: from, m: msg, args, prefix: PREFIX, sender: from.endsWith('@g.us') ? msg.key.participant : from, reply: async (txt) => await sock.sendMessage(from, { text: txt }, { quoted: msg }) };
    await command.run(ctx);
  } catch (e) {}
}
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
    logger: P({ level: 'silent' }),
    browser: [BOT_NAME, 'Chrome', '1.0.0']
  });
  await loadCommands();
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnect:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} CONNECTED - POWERED BY ${POWERED_BY}`);
      global.pairSock = null;
    }
  });
  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type !== 'notify') return;
    await onMessage(sock, upsert);
  });
}
startBot();