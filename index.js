import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath, pathToFileURL } from 'node:url';
import baileys from '@whiskeysockets/baileys';
import { config } from './config.js';

const makeWASocket = baileys.default || baileys.makeWASocket;
const {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadMediaMessage
} = baileys;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_DIR = path.resolve(__dirname, './auth');
const ANTIDELETE_FILE = path.join(AUTH_DIR, 'antidelete.json');
const ONLINE_FILE = path.join(AUTH_DIR, 'online.json');
const logger = pino({ level: 'silent' });

let sock = null;
let status = 'DISCONNECTED';
let pairCode = null;
let pairTime = 0;
let lastNumber = '';
let messageStore = new Map();
const processedCommandIds = new Set();
let commandsMap = new Map();
let antiDeleteEnabled = false;
let alwaysOnline = true;
let onlineInterval = null;

try {
  if (fs.existsSync(ANTIDELETE_FILE)) {
    antiDeleteEnabled = JSON.parse(
      fs.readFileSync(ANTIDELETE_FILE, 'utf8')
    ).enabled;
  }
} catch {}

try {
  if (fs.existsSync(ONLINE_FILE)) {
    alwaysOnline = JSON.parse(
      fs.readFileSync(ONLINE_FILE, 'utf8')
    ).online;
  }
} catch {}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

function cleanAuth() {
  try {
    if (fs.existsSync(AUTH_DIR)) {
      fs.rmSync(AUTH_DIR, { recursive: true, force: true });
    }
  } catch {}

  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  } catch {}
}

function normNum(v) {
  let n = String(v || '').replace(/\D/g, '');
  if (n.startsWith('0')) n = '92' + n.slice(1);
  return n;
}

function getDP() {
  if (config.menuImage?.startsWith('http')) return config.menuImage;
  if (config.botImage?.startsWith('http')) return config.botImage;
  return 'https://i.ibb.co/BHfCmfbw/jawadmd.jpg';
}

function loadCommands() {
  try {
    commandsMap.clear();

    const dir = path.join(__dirname, 'commands');
    if (!fs.existsSync(dir)) return;

    const scan = (d) => {
      for (const f of fs.readdirSync(d)) {
        const p = path.join(d, f);

        if (fs.statSync(p).isDirectory()) {
          scan(p);
        } else if (f.endsWith('.js')) {
          commandsMap.set(f.replace('.js', '').toLowerCase(), p);
        }
      }
    };

    scan(dir);
    console.log(`✅ ${commandsMap.size} cmds`);
  } catch (e) {
    console.log('loadCmd err', e.message);
  }
}

loadCommands();

function saveAntiDelete() {
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(
      ANTIDELETE_FILE,
      JSON.stringify({ enabled: antiDeleteEnabled })
    );
  } catch {}
}

function saveOnline() {
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(
      ONLINE_FILE,
      JSON.stringify({ online: alwaysOnline })
    );
  } catch {}
}

function setOnlinePresence(wa, online) {
  try {
    if (onlineInterval) clearInterval(onlineInterval);

    if (online) {
      wa.sendPresenceUpdate('available').catch(() => {});

      onlineInterval = setInterval(() => {
        if (sock === wa) {
          wa.sendPresenceUpdate('available').catch(() => {});
        }
      }, 25000);
    } else {
      wa.sendPresenceUpdate('unavailable').catch(() => {});
    }
  } catch {}
}

function html() {
  const valid = pairCode && Date.now() - pairTime < 65000;
  const DP = getDP();

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SHADOW MD</title>
<style>
body{margin:0;min-height:100vh;background:#000;display:flex;
justify-content:center;align-items:center;color:#fff;padding:20px;
font-family:Arial}
.card{width:100%;max-width:430px;background:#111;
border:2px solid #ff0040;border-radius:28px;padding:28px;text-align:center}
.dp{width:130px;height:130px;border-radius:50%;border:3px solid #ff0040}
.status{padding:7px 18px;border-radius:20px;font-weight:700;
display:inline-block;margin:10px 0}
.CONNECTED{background:#0f0;color:#000}
.DISCONNECTED{background:#f00}
input,button{width:100%;padding:14px;margin-top:12px;border-radius:14px}
input{background:#000;color:#fff;border:1px solid #333;text-align:center}
button{background:#ff0040;color:#fff;border:none;font-weight:700}
.online{margin-top:10px;padding:8px;border-radius:10px;
background:#222;font-size:13px}
</style>
</head>
<body>
<div class="card">
<img class="dp" src="${DP}">
<h1>SHADOW MD</h1>
<div style="color:#ff4d6d">RANA FURQAN</div>
<div class="status ${status}">${status}</div>
<div class="online">
Online: ${alwaysOnline ? 'ON' : 'OFF'} |
Anti: ${antiDeleteEnabled ? 'ON' : 'OFF'} |
${commandsMap.size} Cmds
</div>
${status === 'CONNECTED'
  ? '<div style="color:#0f0;margin-top:10px">BOT ONLINE</div>'
  : `<form method="post" action="/pair">
<input name="num" value="${lastNumber}" placeholder="92300..." required>
<button>GET CODE</button>
</form>${valid ? `<h1 style="color:#0f0">${pairCode}</h1>` : ''}`}
</div>
</body>
</html>`;
}

app.get('/', (req, res) => res.send(html()));

function getSender(m) {
  return (m.key.participant || m.key.remoteJid || '')
    .replace(/@.*/, '')
    .replace(/\D/g, '');
}

function getOwnerList() {
  let list = config.ownerNumber;

  if (!list) return [];
  if (typeof list === 'string') list = [list];
  if (!Array.isArray(list)) list = [String(list)];

  return list.map(n => String(n).replace(/\D/g, '')).filter(Boolean);
}

function isOwner(m) {
  if (m?.key?.fromMe) return true;

  const sender = getSender(m);
  const owners = getOwnerList();

  if (owners.length === 0) return false;

  const shortSender = sender.slice(-10);

  return owners.some(o =>
    o.slice(-10) === shortSender ||
    sender.endsWith(o.slice(-10))
  );
}

async function handleVV(wa, m, jid, privateTarget = false) {
  try {
    const info = m.message?.extendedTextMessage?.contextInfo;
    const quoted = info?.quotedMessage;

    if (!quoted) {
      await wa.sendMessage(jid, {
        text: 'Reply to a ViewOnce photo, video or voice message with .vv'
      }, { quoted: m });
      return;
    }

    let content =
      quoted.viewOnceMessageV2?.message ||
      quoted.viewOnceMessage?.message ||
      quoted.viewOnceMessageV2Extension?.message ||
      quoted;

    if (content.viewOnceMessageV2) {
      content = content.viewOnceMessageV2.message;
    }

    if (content.viewOnceMessage) {
      content = content.viewOnceMessage.message;
    }

    const buffer = await downloadMediaMessage(
      { key: m.message.extendedTextMessage.contextInfo.stanzaId
          ? {
              remoteJid: jid,
              id: info.stanzaId,
              participant: info.participant
            }
          : m.key,
        message: content },
      'buffer',
      {},
      { logger, reuploadRequest: wa.updateMediaMessage }
    );

    const targetJid = privateTarget
      ? (wa.user.id.split(':')[0] + '@s.whatsapp.net')
      : jid;

    if (content.imageMessage) {
      await wa.sendMessage(targetJid, {
        image: buffer,
        caption: content.imageMessage.caption || 'ViewOnce media'
      });
    } else if (content.videoMessage) {
      await wa.sendMessage(targetJid, {
        video: buffer,
        caption: content.videoMessage.caption || 'ViewOnce media'
      });
    } else if (content.audioMessage) {
      await wa.sendMessage(targetJid, {
        audio: buffer,
        mimetype: content.audioMessage.mimetype || 'audio/ogg; codecs=opus',
        ptt: Boolean(content.audioMessage.ptt)
      });
    } else {
      await wa.sendMessage(jid, {
        text: 'Supported ViewOnce media nahi mila.'
      }, { quoted: m });
      return;
    }

    if (privateTarget) {
      await wa.sendMessage(jid, {
        text: 'Media private chat mein bhejne ki request complete hui.'
      }, { quoted: m });
    }
  } catch (e) {
    console.log('VV ERROR:', e.message);
    await wa.sendMessage(jid, {
      text: 'VV error: ' + e.message
    }, { quoted: m }).catch(() => {});
  }
}

async function startBot(num) {
  // IMPORTANT: num dene par existing auth delete hoti hai.
  // Already paired bot ko dobara pair mat karna.
  if (num) {
    lastNumber = num;
    cleanAuth();
  }

  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const wa = makeWASocket({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    getMessage: async key => messageStore.get(key.id)
  });

  sock = wa;
  status = 'CONNECTING';

  wa.ev.on('creds.update', saveCreds);

  wa.ev.on('messages.upsert', async upsert => {
    try {
      if (upsert.type !== 'notify') return;

      for (const mm of upsert.messages || []) {
        if (mm?.message && mm.key?.id) {
          messageStore.set(mm.key.id, mm);
        }

        if (messageStore.size > 3000) {
          const firstKey = messageStore.keys().next().value;
          messageStore.delete(firstKey);
        }

        const m = mm;
        if (!m?.message || !m.key?.id) continue;
        if (m.key.remoteJid === 'status@broadcast') continue;
        if (m.key.fromMe) continue;
        if (processedCommandIds.has(m.key.id)) continue;

        const messageContent =
          m.message.ephemeralMessage?.message ||
          m.message.viewOnceMessageV2?.message ||
          m.message;

        const text =
          messageContent.conversation ||
          messageContent.extendedTextMessage?.text ||
          messageContent.imageMessage?.caption ||
          messageContent.videoMessage?.caption ||
          messageContent.documentMessage?.caption ||
          '';

        const jid = m.key.remoteJid;
        if (!text || !text.startsWith(config.prefix)) continue;

        processedCommandIds.add(m.key.id);

        if (processedCommandIds.size > 5000) {
          const first = processedCommandIds.values().next().value;
          processedCommandIds.delete(first);
        }

        const args = text.slice(config.prefix.length).trim().split(/\s+/);
        const cmd = args.shift()?.toLowerCase();
        if (!cmd) continue;

        console.log(`CMD: ${cmd}`);

        if (cmd === 'ping') {
          await wa.sendMessage(jid, {
            text: `PONG! 🏓\nOnline: ${alwaysOnline ? 'ON' : 'OFF'}\nCommands: ${commandsMap.size}`
          }, { quoted: m });
          continue;
        }

        if (cmd === 'alive') {
          await wa.sendMessage(jid, {
            text: `${config.botName || 'SHADOW MD'} ALIVE ✅\nOnline: ${alwaysOnline ? 'ON' : 'OFF'}\nAntidelete: ${antiDeleteEnabled ? 'ON' : 'OFF'}\nCommands: ${commandsMap.size}`
          }, { quoted: m });
          continue;
        }

        if (['online', 'offline', 'alwaysonline'].includes(cmd)) {
          if (!isOwner(m)) continue;

          const option = args[0]?.toLowerCase();
          alwaysOnline = cmd === 'online' ||
            (cmd === 'alwaysonline' && option === 'on');

          saveOnline();
          setOnlinePresence(wa, alwaysOnline);

          await wa.sendMessage(jid, {
            text: `Always online ${alwaysOnline ? 'ON' : 'OFF'}`
          }, { quoted: m });
          continue;
        }

        if (['antidelete', 'antidel'].includes(cmd)) {
          if (!isOwner(m)) continue;

          if (args[0]?.toLowerCase() === 'on') {
            antiDeleteEnabled = true;
          } else if (args[0]?.toLowerCase() === 'off') {
            antiDeleteEnabled = false;
          }

          saveAntiDelete();

          await wa.sendMessage(jid, {
            text: `Antidelete ${antiDeleteEnabled ? 'ON' : 'OFF'}`
          }, { quoted: m });
          continue;
        }

        if (cmd === 'vv' || cmd === 'vv2' || cmd === 'vv3') {
          await handleVV(wa, m, jid, cmd !== 'vv');
          continue;
        }

        const fp = commandsMap.get(cmd);
        if (!fp) continue;

        try {
          const mod = await import(
            pathToFileURL(fp).href + `?t=${Date.now()}`
          );

          const isGroup = jid.endsWith('@g.us');
          const senderJid = m.key.participant || jid;
          const senderNum = senderJid.split('@')[0].split(':')[0];
          const info = messageContent.extendedTextMessage?.contextInfo || {};
          const targets = info.mentionedJid?.length
            ? info.mentionedJid
            : (info.participant ? [info.participant] : []);

          const ctx = {
            sock: wa,
            conn: wa,
            m,
            msg: m,
            jid,
            remote: jid,
            args,
            text: args.join(' '),
            isGroup,
            isOwner: isOwner(m),
            sender: senderNum,
            senderNum,
            senderJid,
            content: messageContent,
            prefix: config.prefix,
            config,
            settings: {
              prefix: config.prefix,
              mode: 'public',
              ownerNumber: config.ownerNumber
            },
            commands: commandsMap,
            targets,
            commandList: [...commandsMap.keys()],
            reply: async message =>
              wa.sendMessage(jid, {
                text: String(message)
              }, { quoted: m }),
            getMeta: async () =>
              isGroup ? wa.groupMetadata(jid) : null,
            reload: async () => loadCommands()
          };

          if (typeof mod.command?.run === 'function') {
            await mod.command.run(ctx);
          } else if (typeof mod.execute === 'function') {
            await mod.execute(wa, m, args, {
              config,
              prefix: config.prefix,
              commands: commandsMap,
              conn: wa,
              isOwner: isOwner(m)
            });
          } else if (typeof mod.default?.execute === 'function') {
            await mod.default.execute(wa, m, args, {
              config,
              prefix: config.prefix,
              commands: commandsMap,
              conn: wa,
              isOwner: isOwner(m)
            });
          } else if (typeof mod.run === 'function') {
            await mod.run(ctx);
          } else if (typeof mod.default?.run === 'function') {
            await mod.default.run(ctx);
          } else {
            console.log(`No supported handler in ${cmd}`);
          }
        } catch (e) {
          console.log(`CMD ${cmd} FILE ERR:`, e.stack || e.message);
          await wa.sendMessage(jid, {
            text: `Command .${cmd} error: ${e.message}`
          }, { quoted: m }).catch(() => {});
        }
      }
    } catch (e) {
      console.log('upsert error:', e.stack || e.message);
    }
  });

  wa.ev.on('messages.update', async updates => {
    try {
      if (!antiDeleteEnabled) return;

      for (const { key, update } of updates) {
        if (update?.message === null || update?.messageStubType) {
          const stored = messageStore.get(key.id);
          if (!stored?.message) continue;

          const privateJid =
            wa.user.id.split(':')[0] + '@s.whatsapp.net';

          const content = stored.message.conversation ||
            stored.message.extendedTextMessage?.text ||
            stored.message.imageMessage?.caption ||
            stored.message.videoMessage?.caption ||
            '[Media Message]';

          await wa.sendMessage(privateJid, {
            text: `DELETED MESSAGE\nFrom: ${stored.key.remoteJid}\nMessage: ${content}`
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.log('antidelete error:', e.message);
    }
  });

  wa.ev.on('connection.update', async update => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      status = 'CONNECTED';
      pairCode = null;
      loadCommands();
      setOnlinePresence(wa, alwaysOnline);
      console.log(
        `CONNECTED | ${commandsMap.size} COMMANDS | ONLINE ${alwaysOnline}`
      );
    }

    if (connection === 'close') {
      status = 'DISCONNECTED';
      if (sock === wa) sock = null;

      if (onlineInterval) clearInterval(onlineInterval);

      const code = lastDisconnect?.error?.output?.statusCode;

      if (code !== DisconnectReason.loggedOut) {
        setTimeout(() => {
          if (!sock) startBot().catch(console.error);
        }, 3000);
      }
    }
  });

  if (num) {
    await new Promise(resolve => setTimeout(resolve, 3500));

    try {
      let code = await wa.requestPairingCode(num);
      code = code.toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .match(/.{1,4}/g)
        .join('-');

      pairCode = code;
      pairTime = Date.now();
    } catch (e) {
      console.log('Pair code error:', e.message);
    }
  }
}

app.post('/pair', async (req, res) => {
  const n = normNum(req.body?.num);
  if (!n) return res.status(400).send('Invalid number');

  lastNumber = n;
  pairCode = null;
  status = 'CONNECTING';

  await startBot(n);
  for (let i = 0; i < 12; i++) {
    if (pairCode) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  res.redirect('/');
});

app.listen(PORT, () => console.log('BOT READY ON ' + PORT));

if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) {
  startBot().catch(e => console.log('START ERROR:', e.message));
}