const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = 'auth_info_baileys';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

let pairingCode = null;
let isConnected = false;

// HTML PAGE
app.get('/', async (req, res) => {
  const number = req.query.number;
  if (number) {
    try {
      let cleanNumber = number.replace(/[^0-9]/g, '');
      console.log('Requesting code for:', cleanNumber);
      // Agar socket bana hua hai to usi se code lo
      if (global.sock && !global.sock.authState.creds.registered) {
        await new Promise(r => setTimeout(r, 2000));
        pairingCode = await global.sock.requestPairingCode(cleanNumber);
        console.log('CODE:', pairingCode);
      }
    } catch (e) {
      console.log('Pairing Error:', e.message);
      pairingCode = 'ERROR: ' + e.message;
    }
  }

  res.send(`
  <html><head><title>RANA FURQAN MD</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;margin:0}
    .card{background:#111;padding:30px;border-radius:20px;text-align:center;border:2px solid red;box-shadow:0 0 20px red;width:320px}
    input{width:90%;padding:12px;border-radius:10px;border:none;margin:10px 0;text-align:center;font-size:18px}
    button{width:95%;padding:12px;background:red;color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer}
    .code{font-size:38px;color:#00ff00;background:#222;padding:10px;margin-top:15px;border-radius:10px;letter-spacing:4px}
    .green{color:#00ff00} .yellow{color:yellow}
  </style></head><body>
  <div class="card">
    <h2 style="color:red">🔥 RANA FURQAN MD 🔥</h2>
    ${isConnected ? '<h3 class="green">✅ WHATSAPP CONNECTED!</h3><p>Bot Active Hai</p>' : ''}
    ${!isConnected ? `
    <p class="yellow">${pairingCode ? 'Neeche Code Hai' : 'Number Daalo 92 ke sath'}</p>
    <form method="GET">
      <input name="number" placeholder="9230xxxxxxxx" required value="${req.query.number || ''}"/>
      <button type="submit">GET CODE</button>
    </form>
    ${pairingCode ? `<div class="code">${pairingCode}</div><p style="font-size:12px;margin-top:10px;">WhatsApp > Linked Devices > Link with Phone Number<br>Is code ko 15 sec me dalo</p>` : ''}
    ` : ''}
  </div></body></html>
  `);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
  
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger: pino({ level: 'silent' }),
    browser: Browsers.macOS('Desktop'),
    printQRInTerminal: false,
  });

  global.sock = sock;
  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'open') {
      isConnected = true;
      pairingCode = null;
      console.log('✅ RANA FURQAN MD CONNECTED!');
    }
    if (connection === 'close') {
      isConnected = false;
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log('Connection closed, reason:', reason);
      if (reason === DisconnectReason.loggedOut) {
        console.log('Logged out, deleting auth');
        if (fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
        pairingCode = null;
      }
      // Auto reconnect after 3 sec
      setTimeout(startBot, 3000);
    }
  });

  // ===== BOT COMMANDS - Yahan se bot kaam karega =====
  sock.ev.on('messages.upsert', async ({ messages }) => {
    try {
      const msg = messages[0];
      if (!msg.message || msg.key.fromMe) return;
      
      const from = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

      if (text.toLowerCase() === '.ping' || text.toLowerCase() === 'ping') {
        await sock.sendMessage(from, { text: '🏓 Pong! RANA FURQAN MD Active Hai Bhai! 🔥' });
      }
      if (text.toLowerCase() === '.menu' || text.toLowerCase() === 'menu') {
        await sock.sendMessage(from, { text: `*🔥 RANA FURQAN MD - MENU 🔥*\n\n.ping - Bot Check\n.menu - Ye Menu\n.owner - Owner Info\n\nBot Connected Successfully ✅` });
      }
      if (text.toLowerCase() === '.owner') {
        await sock.sendMessage(from, { text: '*RANA FURQAN MD* Ka Owner - RANA FURQAN 👑' });
      }
    } catch (e) {
      console.log('Message Error:', e.message);
    }
  });
}

app.get('/health', (req, res) => res.send('OK'));

app.listen(PORT, () => {
  console.log(`Server Started on ${PORT}`);
  startBot();
});