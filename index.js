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
global.pairSockets = new Map();

const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html><head><title>${BOT_NAME}</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{text-align:center;font-family:sans-serif;background:#f0f2f5;padding:10px}.box{background:white;padding:30px;border-radius:20px;max-width:420px;margin:30px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}.dp{width:130px;height:130px;border-radius:50%;border:5px solid #25D366;object-fit:cover}input{padding:14px;width:85%;border-radius:10px;border:1px solid #ccc;margin:10px;font-size:16px}button{padding:14px 30px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold;font-size:16px;cursor:pointer}</style>
    </head><body><div class="box">
    <img src="${DP_URL}" class="dp"><h1>🌹 ${BOT_NAME} 🌹</h1><h3 style="color:green">✅ Connected</h3><p>🌹 POWERED BY ${POWERED_BY} 🌹</p><hr>
    <h3>Pair Your Number</h3><form action="/code" method="get"><input type="text" name="number" placeholder="92300XXXXXXXX" required><br><button type="submit">GET PAIR CODE</button></form>
    </div></body></html>
  `);
});

app.get('/code', async (req, res) => {
  let num = req.query.number?.replace(/[^0-9]/g, '');
  if (!num) return res.send('<h2 style="text-align:center">Number dalo! <a href="/">Back</a></h2>');

  // TEMP AUTH FOR PAIRING - YEHI FIX HAI
  const tempAuthPath = `./temp_auth_${num}`;
  if (fs.existsSync(tempAuthPath)) fs.rmSync(tempAuthPath, { recursive: true, force: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempAuthPath);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: [BOT_NAME, 'Chrome', '1.0.0']
    });
    sock.ev.on('creds.update', saveCreds);
    global.pairSockets.set(num, sock);

    await new Promise(r => setTimeout(r, 3000));

    let code = await sock.requestPairingCode(num);
    code = code?.match(/.{1,4}/g)?.join('-') || code; // RXDG4MRV -> RXDG-4MRV jaisa show hoga WhatsApp jaisa

    console.log(`🌹 PAIR CODE FOR ${num}: ${code} - 1 MIN VALID`);

    return res.send(`
      <html><head><title>Pair Code</title><meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body{text-align:center;font-family:sans-serif;background:#f0f2f5;padding:15px}
        .box{background:white;padding:25px;border-radius:20px;max-width:420px;margin:30px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}
        .dp{width:110px;height:110px;border-radius:50%;border:4px solid #25D366;object-fit:cover}
        .code{background:#111;color:#25D366;padding:18px 10px;border-radius:15px;margin:20px auto;font-size:30px;font-weight:bold;letter-spacing:2px;word-break:break-all;max-width:100%;box-sizing:border-box}
        button{padding:12px 25px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer}
        .timer{color:red;font-weight:bold;margin:10px}
      </style>
      </head><body><div class="box">
        <img src="${DP_URL}" class="dp"><h2>🌹 ${BOT_NAME} 🌹</h2>
        <h3>Pair Code for ${num}</h3>
        <div class="code">${code}</div>
        <div class="timer" id="timer">Valid: 60 seconds</div>
        <p>WhatsApp > Linked Devices > Link with Phone Number</p>
        <p style="font-size:13px;color:#555">Code ko waisa hi dalo jaisa likha hai, dash ke sath</p>
        <p><b>🌹 POWERED BY ${POWERED_BY} 🌹</b></p>
        <a href="/"><button>Back to Home</button></a>
      </div>
      <script>
        let t=60; setInterval(()=>{t--; document.getElementById('timer').innerText='Valid: '+t+' seconds'; if(t<=0) document.getElementById('timer').innerText='Code Expired - Get New Code';},1000);
      </script>
      </body></html>
    `);
  } catch(e) {
    console.log('Pair Error: ' + e.message);
    res.send(`<h3 style="text-align:center">Error: ${e.message} <br> Number sahi dalo, 92300... format me<br><a href="/">Back</a></h3>`);
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
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} CONNECTED`);
      try {
        let botPpUrl; try { botPpUrl = await sock.profilePictureUrl(sock.user.id, 'image'); } catch { botPpUrl = DP_URL; }
        let ownerJid = null;
        if (fs.existsSync('./data/antidelete.json')) { try { ownerJid = JSON.parse(fs.readFileSync('./data/antidelete.json')).ownerJid; } catch {} }
        if (!ownerJid && process.env.OWNER_NUMBER) ownerJid = process.env.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (ownerJid) {
          const caption = `🌹 ${BOT_NAME} CONNECTED 🌹\n\n✅ Bot is Online!\n\n🌹 POWERED BY ${POWERED_BY} 🌹`;
          await sock.sendMessage(ownerJid, { image: { url: botPpUrl }, caption });
        }
      } catch {}
    }
  });
  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type !== 'notify') return;
    await onMessage(sock, upsert);
  });
}
startBot();