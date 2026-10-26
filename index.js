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
let pairingInProgress = false;

const app = express();

app.get('/', (req, res) => {
  res.send(`
    <html><head><title>${BOT_NAME}</title><meta name="viewport" content="width=device-width, initial-scale=1">
    <style>body{text-align:center;font-family:sans-serif;background:#f0f2f5;padding:10px}.box{background:white;padding:25px;border-radius:20px;max-width:420px;margin:30px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}.dp{width:120px;height:120px;border-radius:50%;border:4px solid #25D366;object-fit:cover}input{padding:14px;width:85%;border-radius:10px;border:1px solid #ccc;margin:10px}button{padding:14px 30px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold;cursor:pointer}</style>
    </head><body><div class="box"><img src="${DP_URL}" class="dp"><h2>🌹 ${BOT_NAME} 🌹</h2><p>🌹 POWERED BY ${POWERED_BY} 🌹</p><hr>
    <h3>Pair Your Number</h3><form action="/code" method="get"><input type="text" name="number" placeholder="92300XXXXXXXX" required><br><button type="submit">GET PAIR CODE</button></form></div></body></html>
  `);
});

app.get('/code', async (req, res) => {
  let num = req.query.number?.replace(/[^0-9]/g, '');
  if (!num) return res.send('Number dalo <a href="/">Back</a>');
  if (pairingInProgress) return res.send('<h3 style="text-align:center">Ek pairing already chal rahi hai, 1 min ruko<br><a href="/">Back</a></h3>');

  pairingInProgress = true;

  try {
    // Purana auth delete - Fresh start
    if (fs.existsSync('./auth')) {
      fs.rmSync('./auth', { recursive: true, force: true });
      console.log('Old auth deleted for fresh pairing');
      await delay(1000);
    }

    const { state, saveCreds } = await useMultiFileAuthState('./auth');
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
      logger: P({ level: 'silent' }),
      printQRInTerminal: false,
      browser: ["Ubuntu", "Chrome", "20.0.04"],
      markOnlineOnConnect: false
    });

    sock.ev.on('creds.update', saveCreds);

    // IMPORTANT: Wait for socket to be ready
    await delay(4000);

    if (!sock.authState.creds.registered) {
      console.log(`Requesting pairing code for ${num}...`);
      let code = await sock.requestPairingCode(num);
      pairingInProgress = false;
      
      // Format: B6VH-7F37 jaisa
      let formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;

      console.log(`✅ CODE: ${formattedCode} for ${num}`);

      return res.send(`
        <html><head><title>Pair Code</title><meta name="viewport" content="width=device-width, initial-scale=1">
        <style>body{text-align:center;font-family:sans-serif;background:#f0f2f5;padding:15px}.box{background:white;padding:25px;border-radius:20px;max-width:420px;margin:30px auto;box-shadow:0 5px 30px rgba(0,0,0,0.1)}.dp{width:110px;height:110px;border-radius:50%;border:4px solid #25D366}.code{background:#111;color:#25D366;padding:18px;border-radius:15px;margin:20px auto;font-size:30px;font-weight:bold;letter-spacing:2px;word-break:break-all;max-width:100%}.timer{color:red;font-weight:bold;font-size:18px}</style>
        </head><body><div class="box"><img src="${DP_URL}" class="dp"><h2>🌹 ${BOT_NAME} 🌹</h2><h3>Code for ${num}</h3><div class="code">${formattedCode}</div><div class="timer" id="t">Valid: 60 seconds</div><p>WhatsApp > Linked Devices > Link with Phone Number</p><p style="font-size:12px">Abhi dalo, 15 sec ke andar!</p><p><b>🌹 POWERED BY ${POWERED_BY} 🌹</b></p><a href="/"><button style="padding:12px 25px;background:#25D366;color:white;border:none;border-radius:10px;font-weight:bold">Back</button></a></div><script>let t=60;setInterval(()=>{t--;document.getElementById('t').innerText='Valid: '+t+'s';if(t<=0)document.getElementById('t').innerText='Expired - Get New Code';},1000)</script></body></html>
      `);
    } else {
      pairingInProgress = false;
      return res.send('<h2>Already Paired! <a href="/">Home</a></h2>');
    }
  } catch (e) {
    pairingInProgress = false;
    console.log('Pair Error:', e.message);
    // Auth delete taake agla try fresh ho
    if (fs.existsSync('./auth')) fs.rmSync('./auth', { recursive: true, force: true });
    return res.send(`<h3 style="text-align:center">Error: ${e.message}<br>1 min baad dobara try karo<br>Number sahi dalo 9230...<br><a href="/">Back</a></h3>`);
  }
});

app.listen(PORT, () => console.log(`🌐 ${BOT_NAME} Live on ${PORT}`));

// BOT START - Only if already paired
async function loadCommands() {
  const p = path.join(__dirname, 'commands');
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  const files = fs.readdirSync(p).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const mod = await import(`file://${path.join(p, file)}?update=${Date.now()}`);
      const cmd = mod.command || mod.default;
      if (cmd?.name) global.commands.set(cmd.name.toLowerCase(), cmd);
    } catch {}
  }
}

async function startBot() {
  // Agar auth nahi hai ya registered nahi hai to bot start nahi karo, pairing ka wait karo
  if (!fs.existsSync('./auth/creds.json')) {
    console.log('No auth found - Waiting for pairing via website...');
    return;
  }
  try {
    const creds = JSON.parse(fs.readFileSync('./auth/creds.json'));
    if (!creds.registered) {
      console.log('Auth not registered - Waiting for pairing...');
      return;
    }
  } catch {}

  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version, auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
    logger: P({ level: 'silent' }), browser: [BOT_NAME, 'Chrome', '1.0.0']
  });
  await loadCommands();
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) { await delay(3000); startBot(); }
      else { fs.rmSync('./auth', { recursive: true, force: true }); console.log('Logged out'); }
    } else if (connection === 'open') {
      console.log(`✅ ${BOT_NAME} CONNECTED`);
    }
  });
  sock.ev.on('messages.upsert', async (upsert) => {
    const msg = upsert.messages?.[0];
    if (!msg || msg.key.fromMe || !msg.message) return;
    let text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
    if (!text.startsWith(PREFIX)) return;
    const args = text.slice(PREFIX.length).trim().split(/ +/);
    const cmd = global.commands.get(args.shift().toLowerCase());
    if (cmd) { try { await cmd.run({ sock, jid: msg.key.remoteJid, m: msg, args, prefix: PREFIX, reply: async (t) => await sock.sendMessage(msg.key.remoteJid, { text: t }, { quoted: msg }) }); } catch {} }
  });
}

// Pehle bot try karo, agar auth nahi to pairing ka wait karega
startBot();

// Har 30 sec check karo agar pairing hui to bot start karo
setInterval(() => {
  if (!pairingInProgress && fs.existsSync('./auth/creds.json')) {
    try {
      const creds = JSON.parse(fs.readFileSync('./auth/creds.json'));
      if (creds.registered) {
        // Check if bot already running? Simple restart logic
        console.log('Auth registered found, starting bot...');
        startBot();
      }
    } catch {}
  }
}, 15000);