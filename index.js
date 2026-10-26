import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- GLOBAL STORE FOR ANTIDELETE ---
global.messageStore = new Map();
global.commands = new Map();

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  if (!fs.existsSync(commandsPath)) fs.mkdirSync(commandsPath, { recursive: true });
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  console.log(`📂 Found ${files.length} commands: ${files.join(', ')}`);
  for (const file of files) {
    try {
      const filePath = path.join(commandsPath, file);
      const mod = await import(`file://${filePath}?update=${Date.now()}`);
      const cmd = mod.command || mod.default;
      if (cmd && cmd.name) {
        global.commands.set(cmd.name.toLowerCase(), cmd);
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            global.commands.set(alias.toLowerCase(), cmd);
          }
        }
        console.log(`✅ Loaded: ${cmd.name}`);
      }
    } catch (e) {
      console.log(`❌ Failed to load ${file}: ${e.message}`);
    }
  }
}

async function onMessage(sock, upsert) {
  try {
    const msg = upsert.messages?.[0];
    if (!msg || !msg.message) return;
    if (msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const isGroup = from.endsWith('@g.us');
    const sender = isGroup ? msg.key.participant : from;
    
    let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
    if (!text) return;

    const prefix = process.env.PREFIX || '.';
    if (!text.startsWith(prefix)) return;

    const args = text.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();

    const command = global.commands.get(cmdName);
    if (!command) return;

    const ctx = {
      sock,
      jid: from,
      m: msg,
      args,
      prefix,
      sender,
      reply: async (txt) => {
        return await sock.sendMessage(from, { text: txt }, { quoted: msg });
      }
    };

    await command.run(ctx);

  } catch (e) {
    console.log('onMessage error:', e.message);
  }
}

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  
  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'silent' })) },
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['Shadow-MD', 'Chrome', '1.0.0']
  });

  await loadCommands();

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('Connection closed, reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ BOT CONNECTED - RANA KI JAAN - Meri JAAN');
    }
  });

  sock.ev.on('messages.upsert', async (upsert) => {
    if (upsert.type !== 'notify') return;
    const msg = upsert.messages?.[0];
    if (!msg) return;

    // ===== 1. STORE FOR ANTIDELETE =====
    try {
      if (msg && !msg.key.fromMe && msg.message && !msg.message.protocolMessage) {
        global.messageStore.set(msg.key.id, {
          jid: msg.key.remoteJid,
          message: msg.message,
          participant: msg.key.participant || msg.key.remoteJid,
          pushName: msg.pushName || 'Unknown',
          time: new Date().toLocaleString()
        });
        if (global.messageStore.size > 3000) {
          const firstKey = global.messageStore.keys().next().value;
          global.messageStore.delete(firstKey);
        }
      }

      // ===== 2. ANTIDELETE - ONLY PERSONAL WITH NUMBER =====
      if (msg.message && msg.message.protocolMessage && msg.message.protocolMessage.type === 0) {
        const dbPathAD = './data/antidelete.json';
        if (fs.existsSync(dbPathAD)) {
          const dbAD = JSON.parse(fs.readFileSync(dbPathAD));
          if (dbAD.enabled && dbAD.ownerJid) {
            const deletedId = msg.message.protocolMessage.key?.id;
            const stored = global.messageStore.get(deletedId);
            if (stored) {
              const deleterJid = msg.key.participant || msg.participant || msg.key.remoteJid;
              const deleterNum = deleterJid.split('@')[0];
              const senderNum = stored.participant.split('@')[0];

              const alertText = `╭───❀ 🌹 ❀───╮
   🌹 𝐃𝐄𝐋𝐄𝐓𝐄𝐃 𝐀𝐋𝐄𝐑𝐓 🌹
╰───❀ 🌹 ❀───╯

🚨 *Kisi Ne Message Delete Kiya!*

*👤 Jis Ne Delete Kiya:*
• Number: ${deleterNum}
• Link: https://wa.me/${deleterNum}
• Name: ${msg.pushName || 'Unknown'}

*📩 Jis Ka Message Tha:*
• Number: ${senderNum}
• Link: https://wa.me/${senderNum}
• Name: ${stored.pushName}

*💬 Chat:* ${stored.jid.includes('@g.us') ? 'Group' : 'Personal Chat'}
*🕒 Time:* ${stored.time}

*Neeche Deleted Message Hai:*

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
   💖 𝐑𝐀𝐍𝐀 𝐊𝐈 𝐉𝐀𝐀𝐍 💖
╰───❀ 🌹 ❀───╯`;

              await sock.sendMessage(dbAD.ownerJid, { text: alertText });
              try {
                await sock.sendMessage(dbAD.ownerJid, stored.message);
              } catch {
                if (stored.message.conversation) {
                  await sock.sendMessage(dbAD.ownerJid, { text: `*Deleted Text:* ${stored.message.conversation}` });
                } else if (stored.message.extendedTextMessage) {
                  await sock.sendMessage(dbAD.ownerJid, { text: `*Deleted Text:* ${stored.message.extendedTextMessage.text}` });
                }
              }
              global.messageStore.delete(deletedId);
            }
          }
        }
      }
    } catch (e) { console.log('Antidelete store error', e.message) }

    // ===== 3. AUTO REACT =====
    try {
      if (fs.existsSync('./data/autoreact.json')) {
        const db = JSON.parse(fs.readFileSync('./data/autoreact.json'));
        if (db.enabled && msg.key) {
          const emojis = ['❤️','🌹','💖','🔥','😍','🥰','💯','✨'];
          const emoji = emojis[Math.floor(Math.random()*emojis.length)];
          await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
        }
      }
    } catch {}

    // ===== 4. AUTO PLAY =====
    try {
      if (fs.existsSync('./data/autoplay.json')) {
        const db = JSON.parse(fs.readFileSync('./data/autoplay.json'));
        if (db.enabled) {
          const txt = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          if (txt && !txt.startsWith('.') && txt.length > 2 && txt.length < 60 && !msg.key.fromMe && !msg.message.protocolMessage) {
            const ignore = ['menu','ping','alive','owner','bot','help','antidelete','autoplay','autovideo'];
            if (!ignore.includes(txt.toLowerCase().trim())) {
              msg.message.conversation = `.play ${txt}`;
            }
          }
        }
      }
    } catch {}

    // ===== 5. AUTO VIDEO =====
    try {
      if (fs.existsSync('./data/autovideo.json')) {
        const db = JSON.parse(fs.readFileSync('./data/autovideo.json'));
        if (db.enabled) {
          const txt = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          if (txt && !txt.startsWith('.') && txt.length > 2 && txt.length < 60 && !msg.key.fromMe && !msg.message.protocolMessage) {
            const ignore = ['menu','ping','alive','owner','bot','help','antidelete','autoplay','autovideo'];
            if (!ignore.includes(txt.toLowerCase().trim())) {
              msg.message.conversation = `.video ${txt}`;
            }
          }
        }
      }
    } catch {}

    await onMessage(sock, upsert);
  });
}

startBot();