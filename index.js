import makeWASocket, { useMultiFileAuthState, Browsers, DisconnectReason } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import P from 'pino';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
global.commands = new Map();
const PREFIX = process.env.PREFIX || '.';
async function loadCommands() {
  const cmdPath = path.join(__dirname, 'commands');
  const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
  for (const file of files) {
    try {
      const mod = await import(`file://${path.join(cmdPath, file)}?t=${Date.now()}`);
      const cmd = mod.command || mod.default || mod;
      if (!cmd?.name) continue;
      global.commands.set(cmd.name.toLowerCase(), cmd);
      if (cmd.aliases) for (const a of cmd.aliases) global.commands.set(a.toLowerCase(), cmd);
      console.log(`✅ ${cmd.name}`);
    } catch (e) { console.log(`❌ ${file}: ${e.message}`); }
  }
}
async function startBot() {
  await loadCommands();
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const sock = makeWASocket({ auth: state, logger: P({ level: 'silent' }), browser: Browsers.macOS('Desktop'), syncFullHistory: false, markOnlineOnConnect: false, getMessage: async () => undefined });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u) => {
    if (u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) startBot();
    if (u.connection === 'open') console.log('✅ RANA FURQAN MD CONNECTED');
  });
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg?.message) return;
    const from = msg.key.remoteJid;
    if (from.includes('broadcast')) return;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';
    if (!text.startsWith(PREFIX)) return;
    const args = text.slice(PREFIX.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = global.commands.get(cmdName);
    if (!cmd) return;
    const isSelf = msg.key.fromMe;
    await cmd.run({ sock, jid: from, from, m: msg, msg, args, text: args.join(' '), prefix: PREFIX, isGroup: from.endsWith('@g.us'), sender: msg.key.participant || from, reply: async (t) => { if(isSelf) return sock.sendMessage(from, {text: t}); else return sock.sendMessage(from, {text: t}, {quoted: msg}).catch(()=>sock.sendMessage(from, {text: t})); } });
  });
}
startBot();