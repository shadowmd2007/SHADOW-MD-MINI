import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import P from 'pino';
import { loadCommands, onMessage } from './handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const messageStore = new Map(); // For AntiDelete
const status = { start: Date.now(), qr: null, connected: false };

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: state,
    logger: P({ level: 'silent' }),
    printQRInTerminal: true,
    browser: ['Shadow-MD', 'Chrome', '1.0']
  });

  const generation = Date.now();
  let myGen = generation;

  await loadCommands();

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      status.connected = true;
      console.log('✅ BOT CONNECTED - RANA KI JAAN');
    }
  });

  sock.ev.on('messages.upsert', async (upsert) => {
    if (myGen !== generation || upsert.type !== 'notify') return;
    const msg = upsert.messages?.[0];
    if (!msg) return;

    // === 1. STORE FOR ANTIDELETE ===
    try {
      if (msg && !msg.key.fromMe && msg.message && !msg.message.protocolMessage) {
        messageStore.set(msg.key.id, {
          jid: msg.key.remoteJid,
          message: msg.message,
          participant: msg.key.participant || msg.key.remoteJid,
          pushName: msg.pushName || 'Unknown',
        });
        if (messageStore.size > 2000) {
          const firstKey = messageStore.keys().next().value;
          messageStore.delete(firstKey);
        }
      }

      // === 2. DETECT DELETE - ONLY PERSONAL ===
      if (msg.message && msg.message.protocolMessage && msg.message.protocolMessage.type === 0) {
        const dbPathAD = './data/antidelete.json';
        if (fs.existsSync(dbPathAD)) {
          const dbAD = JSON.parse(fs.readFileSync(dbPathAD));
          if (dbAD.enabled && dbAD.ownerJid) {
            const deletedId = msg.message.protocolMessage.key?.id;
            const stored = messageStore.get(deletedId);
            if (stored) {
              const deleterJid = msg.key.participant || msg.participant || msg.key.remoteJid;
              const deleterNum = deleterJid.split('@')[0];
              const senderNum = stored.participant.split('@')[0];

              const alertText = `╭───❀ 🌹 ❀───╮
   🌹 𝐃𝐄𝐋𝐄𝐓𝐄𝐃 𝐀𝐋𝐄𝐑𝐓 🌹
╰───❀ 🌹 ❀───╯

🚨 *Kisi Ne Message Delete Kiya!*

*👤 Jis Ne Delete Kiya:*
Number: ${deleterNum}
Link: https://wa.me/${deleterNum}
Name: ${msg.pushName || 'Unknown'}

*📩 Jis Ka Message Tha:*
Number: ${senderNum}
Link: https://wa.me/${senderNum}
Name: ${stored.pushName}

*💬 Chat Type:* ${stored.jid.includes('@g.us') ? 'Group' : 'Personal'}

*Neeche Deleted Message:*

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
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
              messageStore.delete(deletedId);
            }
          }
        }
      }
    } catch (e) { console.log('Antidelete error', e) }

    // === 3. AUTO REACT ===
    try {
      if (fs.existsSync('./data/autoreact.json')) {
        const db = JSON.parse(fs.readFileSync('./data/autoreact.json'));
        if (db.enabled && msg.key) {
          const emojis = ['❤️','🌹','💖','🔥','😍','🥰','💯'];
          const emoji = emojis[Math.floor(Math.random()*emojis.length)];
          await sock.sendMessage(msg.key.remoteJid, { react: { text: emoji, key: msg.key } });
        }
      }
    } catch {}

    // === 4. AUTO PLAY ===
    try {
      if (fs.existsSync('./data/autoplay.json')) {
        const db = JSON.parse(fs.readFileSync('./data/autoplay.json'));
        if (db.enabled) {
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          if (text && !text.startsWith('.') && text.length > 2 && text.length < 60 && !msg.key.fromMe && !msg.message.protocolMessage) {
            const ignore = ['menu','ping','alive','owner','bot','help'];
            if (!ignore.includes(text.toLowerCase().trim())) {
              msg.message.conversation = `.play ${text}`;
            }
          }
        }
      }
    } catch {}

    // === 5. AUTO VIDEO ===
    try {
      if (fs.existsSync('./data/autovideo.json')) {
        const db = JSON.parse(fs.readFileSync('./data/autovideo.json'));
        if (db.enabled) {
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          if (text && !text.startsWith('.') && text.length > 2 && text.length < 60 && !msg.key.fromMe && !msg.message.protocolMessage) {
            const ignore = ['menu','ping','alive','owner','bot','help'];
            if (!ignore.includes(text.toLowerCase().trim())) {
              msg.message.conversation = `.video ${text}`;
            }
          }
        }
      }
    } catch {}

    onMessage(sock, upsert).catch(e => console.log(e));
  });
}

startBot();