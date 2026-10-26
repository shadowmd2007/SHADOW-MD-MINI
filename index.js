import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ====== CONFIG - RANA FURQAN MD - POWERED BY MERI JAAN ======
const BOT_NAME = 'RANA FURQAN MD';
const POWERED_BY = 'MERI JAAN';
const DP_URL = process.env.BOT_DP || 'https://files.catbox.moe/y04tbj.jpg'; // Apni DP ka link yahan
const PORT = process.env.PORT || 3000;
const PREFIX = process.env.PREFIX || '.';

global.messageStore = new Map();
global.commands = new Map();

// ====== WEB SERVER ======
const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>${BOT_NAME} - ${POWERED_BY}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{text-align:center;font-family:sans-serif;padding:10px;background:#f0f2f5}
        .box{background:white;padding:30px;border-radius:20px;max-width:420px;margin:40px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}
        .dp{width:130px;height:130px;border-radius:50%;border:5px solid #25D366;object-fit:cover;margin-bottom:15px}
        input{padding:14px;width:85%;border-radius:10px;border:1px solid #ccc;margin:10px;font-size:16px}
        button{padding:14px 30px;background:#25D366;color:white;border:none;border-radius:10px;cursor:pointer;font-weight:bold;font-size:16px}
        h1{color:#111;margin:10px 0;font-size:22px}
      </style>
    </head>
    <body>
      <div class="box">
        <img src="${DP_URL}" class="dp" alt="Bot DP" onerror="this.src='https://files.catbox.moe/y04tbj.jpg'">
        <h1>🌹 ${BOT_NAME} 🌹</h1>
        <h3 style="color:green;">Bot Status: ✅ Connected</h3>
        <p>🌹 POWERED BY ${POWERED_BY} 🌹</p>
        <hr style="margin:20px 0">
        <h3>Pair Your Number</h3>
        <form action="/code" method="get">
          <input type="text" name="number" placeholder="9230XXXXXXXX" required>
          <br>
          <button type="submit">GET PAIR CODE</button>
        </form>
        <p style="font-size:12px;margin-top:20px;color:#888">Bot is running successfully</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/code', async (req, res) => {
  let num = req.query.number?.replace(/[^0-9]/g, '');
  if (!num) return res.send('<h2 style="text-align:center">Number dalo Meri JAAN! <br><a href="/">Back</a></h2>');

  try {
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

    await new Promise(r => setTimeout(r, 2000));

    if (!sock.authState.creds.registered) {
      let code = await sock.requestPairingCode(num);
      console.log(`🌹 PAIR CODE FOR ${num}: ${code} - POWERED BY ${POWERED_BY} 🌹`);
      
      return res.send(`
        <html>
        <head><title>Pair Code - ${BOT_NAME}</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body{text-align:center;font-family:sans-serif;background:#f0f2f5;padding:20px}
          .box{background:white;padding:30px;border-radius:20px;max-width:420px;margin:40px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}
          .dp{width:110px;height:110px;border-radius:50%;border:4px solid #25D366;object-fit:cover}
          .code{font-size:36px;font-weight:bold;letter-spacing:7px;background:#111;color:#25D366;padding:20px;border-radius:15px;margin:20px 0}
          button{padding:12px 25px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer}
        </style>
        </head>
        <body>
          <div class="box">
            <img src="${DP_URL}" class="dp">
            <h2>🌹 ${BOT_NAME} 🌹</h2>
            <h3>Pair Code for ${num}</h3>
            <div class="code">${code}</div>
            <p>WhatsApp > Linked Devices > Link with Phone Number</p>
            <p style="color:red;font-size:13px">Code 30 second ke liye valid hai</p>
            <p><b>🌹 POWERED BY ${POWERED_BY} 🌹</b></p>
            <a href="/"><button>Back to Home</button></a>
          </div>
        </body>
        </html>
      `);
    } else {
      res.send(`<h2 style="text-align:center">Already Paired Meri JAAN! <br><a href="/">Home</a></h2>`);
    }
  } catch(e) {
    console.log('Pair Error: ' + e.message);
    res.send(`<h3 style="text-align:center">Error: ${e.message} <br> Dobara try karo Meri JAAN! <br><a href="/">Back</a></h3>`);
  }
});

app.listen(PORT, () => console.log(`🌐 ${BOT_NAME} Web + Pair Server Live on ${PORT} - POWERED BY ${POWERED_BY}`));

// ====== BOT LOGIC ======
async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  console.log(`📂 Found ${files.length} commands - POWERED BY ${POWERED_BY}`);
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
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} CONNECTED - POWERED BY ${POWERED_BY}`);
      try {
        let botPpUrl;
        try { botPpUrl = await sock.profilePictureUrl(sock.user.id, 'image'); } catch { botPpUrl = DP_URL; }
        let ownerJid = null;
        if (fs.existsSync('./data/antidelete.json')) {
          try { ownerJid = JSON.parse(fs.readFileSync('./data/antidelete.json')).ownerJid; } catch {}
        }
        if (!ownerJid && process.env.OWNER_NUMBER) ownerJid = process.env.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (ownerJid) {
          const caption = `🌹 ${BOT_NAME} CONNECTED 🌹\n\n✅ Bot is Online!\n\n🌹 POWERED BY ${POWERED_BY} 🌹`;
          await sock.sendMessage(ownerJid, { image: { url: botPpUrl }, caption });
        }
      } catch(e) {}
    }
  });
  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type !== 'notify') return;
    const msg = upsert.messages?.[0];
    if (!msg) return;
    try {
      if (msg && !msg.key.fromMe && msg.message && !msg.message.protocolMessage) {
        global.messageStore.set(msg.key.id, { jid: msg.key.remoteJid, message: msg.message, participant: msg.key.participant || msg.key.remoteJid, pushName: msg.pushName || 'Unknown' });
      }
    } catch {}
    await onMessage(sock, upsert);
  });
}
startBot();