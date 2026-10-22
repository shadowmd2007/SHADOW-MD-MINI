const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');

const AUTH_DIR = path.join(__dirname, 'auth', 'main');
let commands = [];

// 1. Saare Commands Load Karo
function loadCommands() {
  const cmdPath = path.join(__dirname, 'commands');
  const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
  for (let file of files) {
    try {
      const cmd = require(path.join(cmdPath, file));
      if (cmd.pattern || cmd.name) {
        commands.push(cmd);
      }
    } catch (e) {
      console.log(`Failed to load ${file}: ${e.message}`);
    }
  }
  console.log(`[SHADOW-MD] Total Commands Loaded: ${commands.length}`);
  global.commands = commands;
}
loadCommands();

// 2. Bot Start Karo
async function startBot() {
  if (!fs.existsSync(AUTH_DIR)) {
    console.log("Auth not found, waiting for pairing via web.js...");
    return;
  }
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    browser: Browsers.windows('Chrome'),
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log("SHADOW-MD Connected! Commands: " + commands.length);
    }
  });

  // Message Handler
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const m = messages[0];
    if (!m.message || m.key.fromMe) return;
    const body = m.message.conversation || m.message.extendedTextMessage?.text || "";
    if (!body.startsWith('.')) return;

    const cmdName = body.split(' ')[0].slice(1).toLowerCase();
    const cmd = commands.find(c => c.pattern === cmdName || c.alias?.includes(cmdName) || c.name === cmdName);
    if (cmd && cmd.function) {
      try { await cmd.function(sock, m, {}); } catch (e) { console.log(e); }
    }
  });
}

// 3. Web Server (Pairing) bhi start karo
require('./web.js');
startBot();