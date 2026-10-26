import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const ctx = {
      sock, jid: from, m: msg, args, prefix,
      sender: from.endsWith('@g.us') ? msg.key.participant : from,
      reply: async (txt) => await sock.sendMessage(from, { text: txt }, { quoted: msg })
    };
    await command.run(ctx);
  } catch (e) { console.log(e.message); }
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
      
      // ===== CONNECT DP ONLY PERSONAL - RANA FURQAN MD =====
      try {
        let botPpUrl;
        try { botPpUrl = await sock.profilePictureUrl(sock.user.id, 'image'); } 
        catch { botPpUrl = 'https://files.catbox.moe/y04tbj.jpg'; }

        let ownerJid = null;
        if (fs.existsSync('./data/antidelete.json')) {
          const db = JSON.parse(fs.readFileSync('./data/antidelete.json'));
          ownerJid = db.ownerJid;
        }
        if (!ownerJid && process.env.OWNER_NUMBER) {
          ownerJid = process.env.OWNER_NUMBER.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
        }

        if (ownerJid) {
          const pkgVer = fs.existsSync('./package.json') ? JSON.parse(fs.readFileSync('./package.json')).version : '2.0.0';
          const mode = process.env.MODE || 'PUBLIC';
          const prefix = process.env.PREFIX || '.';

          const connectText = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐑𝐀𝐍𝐀 𝐅𝐔𝐑𝐐𝐀𝐍 𝐌𝐃 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━╯

╭───❀ 🌹 ❀───╮
   💖 𝐑𝐀𝐍𝐀 𝐊𝐈 𝐉𝐀𝐍 💖
╰───❀ 🌹 ❀───╯

✅ *𝐁𝐎𝐓 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃 𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘!*

╭━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━┓
┃  🔰 𝐁𝐎𝐓 𝐍𝐀𝐌𝐄 : 𝐑𝐀𝐍𝐀 𝐅𝐔𝐑𝐐𝐀𝐍 𝐌𝐃
┃  🔰 𝐕𝐄𝐑𝐒𝐈𝐎𝐍 : ${pkgVer}
┃  🔰 𝐌𝐎𝐃𝐄 : ${mode.toUpperCase()}
┃  🔰 𝐏𝐑𝐄𝐅𝐈𝐗 : ${prefix}
┃  🔰 𝐒𝐓𝐀𝐓𝐔𝐒 : 𝐎𝐍𝐋𝐈𝐍𝐄 ✅
┃  🔰 𝐎𝐖𝐍𝐄𝐑 : 𝐑𝐀𝐍𝐀 𝐅𝐔𝐑𝐐𝐀𝐍
┗━━━━━━━━━━━━━━━━━━┛

*Bot is now ready!*
Type ${prefix}menu

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
   💖 𝐑𝐀𝐍𝐀 𝐊𝐈 𝐉𝐀𝐀𝐍 💖
╰───❀ 🌹 ❀───╯`;

          await sock.sendMessage(ownerJid, { image: { url: botPpUrl }, caption: connectText });
        }
      } catch (e) { console.log('Connect DP error:', e.message); }
    }
  });

  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type !== 'notify') return;
    const msg = upsert.messages?.[0];
    if (!msg) return;

    // ANTIDELETE ONLY PERSONAL
    try {
      if (msg && !msg.key.fromMe && msg.message && !msg.message.protocolMessage) {
        global.messageStore.set(msg.key.id, {
          jid: msg.key.remoteJid, message: msg.message,
          participant: msg.key.participant || msg.key.remoteJid,
          pushName: msg.pushName || 'Unknown', time: new Date().toLocaleString()
        });
      }
      if (msg.message?.protocolMessage?.type === 0) {
        const dbPathAD = './data/antidelete.json';
        if (fs.existsSync(dbPathAD)) {
          const dbAD = JSON.parse(fs.readFileSync(dbPathAD));
          if (dbAD.enabled && dbAD.ownerJid) {
            const stored = global.messageStore.get(msg.message.protocolMessage.key?.id);
            if (stored) {
              const deleterJid = msg.key.participant || msg.participant || msg.key.remoteJid;
              const deleterNum = deleterJid.split('@')[0];
              const senderNum = stored.participant.split('@')[0];
              const alertText = `╭───❀ 🌹 ❀───╮
   🌹 𝐑𝐀𝐍𝐀 𝐅𝐔𝐑𝐐𝐀𝐍 𝐌𝐃 🌹
╰───❀ 🌹 ❀───╯

🚨 *DELETED ALERT*

*Delete By:* ${deleterNum}
https://wa.me/${deleterNum}
Name: ${msg.pushName || 'Unknown'}

*Original Sender:* ${senderNum}
https://wa.me/${senderNum}
Name: ${stored.pushName}

POWERED BY RANA KI JAAN`;
              await sock.sendMessage(dbAD.ownerJid, { text: alertText });
              try { await sock.sendMessage(dbAD.ownerJid, stored.message); } catch {}
              global.messageStore.delete(msg.message.protocolMessage.key?.id);
            }
          }
        }
      }
    } catch {}

    await onMessage(sock, upsert);
  });
}
startBot();