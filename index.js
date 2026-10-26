import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== WEB SERVER + PAIR SITE - POWERED BY MERI JAAN =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head><title>RANA FURQAN MD - MERI JAAN</title>
    <style>
      body{text-align:center;font-family:sans-serif;padding:20px;background:#f5f5f5}
      .box{background:white;padding:30px;border-radius:15px;max-width:400px;margin:50px auto;box-shadow:0 0 20px #ccc}
      input{padding:12px;width:80%;border-radius:8px;border:1px solid #ccc;margin:10px}
      button{padding:12px 25px;background:#25D366;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold}
      h1{color:#111}
    </style>
    </head>
    <body>
      <div class="box">
        <h1>🌹 RANA FURQAN MD ONLINE 🌹</h1>
        <h3 style="color:green;">Bot Status: ✅ Connected</h3>
        <p>🌹 POWERED BY MERI JAAN 🌹</p>
        <hr>
        <h3>Pair Your Number</h3>
        <form action="/code" method="get">
          <input type="text" name="number" placeholder="9230XXXXXXXX - Number without +" required>
          <br>
          <button type="submit">GET PAIR CODE</button>
        </form>
        <p style="font-size:12px;margin-top:20px;">Bot is running successfully</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/code', async (req, res) => {
  let num = req.query.number?.replace(/[^0-9]/g, '');
  if (!num) return res.send('<h3>Number dalo Meri JAAN!</h3><a href="/">Back</a>');
  
  res.send(`
    <div style="text-align:center;margin-top:100px;font-family:sans-serif">
      <h2>🌹 RANA FURQAN MD 🌹</h2>
      <h3>Pair Code generating for: ${num}</h3>
      <p>Please wait... Check Railway Logs for Code</p>
      <p><b>POWERED BY MERI JAAN</b></p>
      <a href="/">Back to Home</a>
    </div>
  `);

  // Generate Pair Code in background
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ['RANA FURQAN MD', 'Chrome', '1.0.0']
    });
    setTimeout(async () => {
      if (!sock.authState.creds.registered) {
        let code = await sock.requestPairingCode(num);
        console.log(`\n\n🌹 PAIR CODE FOR ${num}: ${code} - POWERED BY MERI JAAN 🌹\n\n`);
      }
    }, 3000);
  } catch(e) { console.log(e) }
});

app.listen(PORT, () => console.log(`🌐 Web + Pair Server Live on ${PORT} - POWERED BY MERI JAAN`));
// ===== END =====

// Baki tumhara bot wala code neeche same rahega...
global.messageStore = new Map();
global.commands = new Map();

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  console.log(`📂 Found ${files.length} commands - POWERED BY MERI JAAN`);
  for (const file of files) {
    try {
      const filePath = path.join(commandsPath, file);
      const mod = await import(`file://${filePath}?update=${Date.now()}`);
      const cmd = mod.command || mod.default;
      if (cmd && cmd.name) {
        global.commands.set(cmd.name.toLowerCase(), cmd);
        if (cmd.aliases) for (const a of cmd.aliases) global.commands.set(a.toLowerCase(), cmd);
      }
    } catch (e) { console.log(`❌ ${file}: ${e.message}`); }
  }
}
async function onMessage(sock, upsert) { /* tumhara purana onMessage */ 
  try {
    const msg = upsert.messages?.[0];
    if (!msg || !msg.message || msg.key.fromMe) return;
    const from = msg.key.remoteJid;
    let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
    if (!text) return;
    const prefix = process.env.PREFIX || '.';
    if (!text.startsWith(prefix)) return;
    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const command = global.commands.get(cmdName);
    if (!command) return;
    const ctx = { sock, jid: from, m: msg, args, prefix, sender: from.endsWith('@g.us') ? msg.key.participant : from, reply: async (txt) => await sock.sendMessage(from, { text: txt }, { quoted: msg }) };
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
    browser: ['RANA FURQAN MD', 'Chrome', '1.0.0']
  });
  await loadCommands();
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ RANA FURQAN MD CONNECTED - POWERED BY MERI JAAN');
      try {
        let botPpUrl;
        try { botPpUrl = await sock.profilePictureUrl(sock.user.id, 'image'); } catch { botPpUrl = 'https://files.catbox.moe/y04tbj.jpg'; }
        let ownerJid = null;
        if (fs.existsSync('./data/antidelete.json')) ownerJid = JSON.parse(fs.readFileSync('./data/antidelete.json')).ownerJid;
        if (!ownerJid && process.env.OWNER_NUMBER) ownerJid = process.env.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (ownerJid) {
          const caption = `🌹 RANA FURQAN MD CONNECTED 🌹\n\nPOWERED BY MERI JAAN`;
          await sock.sendMessage(ownerJid, { image: { url: botPpUrl }, caption });
        }
      } catch {}
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
      if (msg.message?.protocolMessage?.type === 0) {
        const dbPathAD = './data/antidelete.json';
        if (fs.existsSync(dbPathAD)) {
          const dbAD = JSON.parse(fs.readFileSync(dbPathAD));
          if (dbAD.enabled && dbAD.ownerJid) {
            const stored = global.messageStore.get(msg.message.protocolMessage.key?.id);
            if (stored) {
              const deleterJid = msg.key.participant || msg.participant || msg.key.remoteJid;
              await sock.sendMessage(dbAD.ownerJid, { text: `DELETED by ${deleterJid.split('@')[0]} - POWERED BY MERI JAAN` });
              try { await sock.sendMessage(dbAD.ownerJid, stored.message); } catch {}
            }
          }
        }
      }
    } catch {}
    await onMessage(sock, upsert);
  });
}
startBot();