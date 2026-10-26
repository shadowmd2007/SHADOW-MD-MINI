import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- FIX FOR RAILWAY 502 - Website Server ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send(`<h1>🌹 RANA FURQAN MD ONLINE 🌹</h1><h3>Bot Status: ✅ Connected</h3><p>Powered By RANA KI JAAN</p>`);
});
app.listen(PORT, () => console.log(`🌐 Server Live on ${PORT}`));
// --- END FIX ---

global.messageStore = new Map();
global.commands = new Map();

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
    } catch (e) { console.log(`❌ ${file}: ${e.message}`); }
  }
}

async function onMessage(sock, upsert) {
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
    printQRInTerminal: true,
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
      console.log('✅ RANA FURQAN MD CONNECTED');
      try {
        let botPpUrl;
        try { botPpUrl = await sock.profilePictureUrl(sock.user.id, 'image'); } catch { botPpUrl = 'https://files.catbox.moe/y04tbj.jpg'; }
        let ownerJid = null;
        if (fs.existsSync('./data/antidelete.json')) ownerJid = JSON.parse(fs.readFileSync('./data/antidelete.json')).ownerJid;
        if (!ownerJid && process.env.OWNER_NUMBER) ownerJid = process.env.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        if (ownerJid) {
          const connectText = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐑𝐀𝐍𝐀 𝐅𝐔𝐑𝐐𝐀𝐍 𝐌𝐃 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━╯

✅ *BOT CONNECTED!*
Bot Name: RANA FURQAN MD
Status: ONLINE ✅

Type .menu

POWERED BY RANA KI JAAN`;
          await sock.sendMessage(ownerJid, { image: { url: botPpUrl }, caption: connectText });
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
              await sock.sendMessage(dbAD.ownerJid, { text: `🚨 DELETED by ${deleterJid.split('@')[0]} https://wa.me/${deleterJid.split('@')[0]}` });
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