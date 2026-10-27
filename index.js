import makeWASocket, { useMultiFileAuthState, Browsers, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import P from 'pino';
import express from 'express'; // Railway ke liye zaruri

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

global.commands = new Map();
const PREFIX = process.env.PREFIX || '.';
const PORT = process.env.PORT || 3000;

// --- Railway 502 Fix - Web Server ---
const app = express();
app.get('/', (req, res) => {
  res.send(`<h1>🌹 RANA FURQAN MD ACTIVE 🌹</h1><p>BOT IS RUNNING - POWERED BY MERI JAAN</p><p>Commands Loaded: ${global.commands.size}</p>`);
});
app.listen(PORT, () => {
  console.log(`✅ WEB SERVER RUNNING ON PORT ${PORT}`);
});
// --- End Server ---

async function loadCommands() {
  const cmdPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(cmdPath)) return;
  const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
  console.log(`Found ${files.length} command files`);
  for (const file of files) {
    try {
      const mod = await import(`file://${path.join(cmdPath, file)}?t=${Date.now()}`);
      const cmd = mod.command || mod.default || mod;
      if (!cmd?.name) {
        console.log(`❌ SKIP ${file} - no name`);
        continue;
      }
      global.commands.set(cmd.name.toLowerCase(), cmd);
      if (cmd.aliases) {
        for (const a of cmd.aliases) global.commands.set(a.toLowerCase(), cmd);
      }
      console.log(`✅ Loaded: ${cmd.name}`);
    } catch (e) {
      console.log(`❌ FAILED ${file}: ${e.message}`);
    }
  }
  console.log(`✅ TOTAL ${global.commands.size} COMMANDS LOADED`);
}

async function startBot() {
  try {
    await loadCommands();
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
      auth: state,
      logger: P({ level: 'silent' }),
      browser: Browsers.macOS('Desktop'),
      syncFullHistory: false,
      markOnlineOnConnect: false,
      getMessage: async () => undefined
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (u) => {
      const { connection, lastDisconnect } = u;
      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log(`Connection closed: ${code}`);
        if (code !== DisconnectReason.loggedOut) {
          console.log('Reconnecting...');
          setTimeout(startBot, 3000);
        }
      } else if (connection === 'open') {
        console.log('✅ RANA FURQAN MD CONNECTED - POWERED BY MERI JAAN');
      }
    });

    sock.ev.on('messages.upsert', async ({ messages }) => {
      try {
        const msg = messages[0];
        if (!msg?.message) return;
        const from = msg.key.remoteJid;
        if (from === 'status@broadcast' || from.endsWith('@broadcast')) return;

        const messageContent = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
        if (!messageContent.startsWith(PREFIX)) return;

        const args = messageContent.slice(PREFIX.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();
        const cmd = global.commands.get(cmdName);
        if (!cmd) return;

        console.log(`📩 ${PREFIX}${cmdName} from ${from}`);
        const isSelfChat = msg.key.fromMe;

        await cmd.run({
          sock, jid: from, from, m: msg, msg, args,
          text: args.join(' '), prefix: PREFIX,
          isGroup: from.endsWith('@g.us'),
          sender: msg.key.participant || from,
          reply: async (txt) => {
            try {
              if (isSelfChat) return await sock.sendMessage(from, { text: txt });
              else return await sock.sendMessage(from, { text: txt }, { quoted: msg });
            } catch {
              return await sock.sendMessage(from, { text: txt });
            }
          }
        });
      } catch (e) {
        console.error('Handler Error:', e);
      }
    });
  } catch (e) {
    console.error('StartBot Error:', e);
    setTimeout(startBot, 5000);
  }
}

startBot();