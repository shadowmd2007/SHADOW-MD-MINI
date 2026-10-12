const fs = require('fs');
const path = require('path');
const pino = require('pino');

const AUTH_ROOT = process.env.AUTH_DIR || path.join(__dirname, 'auth');
const MAIN_DIR = path.join(AUTH_ROOT, 'main');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const hasCreds = () => fs.existsSync(path.join(MAIN_DIR, 'creds.json'));

let running = false;

let cmds = null;
try {
  cmds = require('./commands.js');
} catch (e) {
  console.log('commands.js load error: ' + e.message);
}

async function onMessage(sock, m) {
  const fn = cmds?.handleCommands || cmds?.handleMessage;
  if (typeof fn === 'function') return fn(sock, m);
}

async function startBot() {
  if (running) return;
  running = true;

  const B = require('@whiskeysockets/baileys');

  while (!hasCreds()) {
    console.log('Waiting for pairing... (web page pe number daalo)');
    await sleep(5000);
  }
  await sleep(8000);

  const { version } = await B.fetchLatestBaileysVersion();

  const connect = async () => {
    const { state, saveCreds } = await B.useMultiFileAuthState(MAIN_DIR);
    const sock = B.default({
      version,
      auth: {
        creds: state.creds,
        keys: B.makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      logger: pino({ level: 'silent' }),
      browser: B.Browsers.windows('Chrome'),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: false,
    });

    sock.ev.on('creds.update', saveCreds);

    try { cmds?.init?.(sock); } catch (e) { console.log('init error: ' + e.message); }

    sock.ev.on('connection.update', async (u) => {
      const { connection, lastDisconnect } = u;

      if (connection === 'open') {
        console.log('✅ SHADOW-MD-MINI connected');
      }

      if (connection === 'close') {
        const st = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed, code: ' + st);

        if (st === B.DisconnectReason.loggedOut) {
          console.log('Logged out. Session delete, dobara pair karo.');
          try { fs.rmSync(MAIN_DIR, { recursive: true, force: true }); } catch {}
          running = false;
          return startBot();
        }

        if (st === B.DisconnectReason.connectionReplaced) {
          console.log('Same number dusri jagah chal raha hai (Railway band karo). 30s baad retry.');
          await sleep(30000);
        } else {
          await sleep(3000);
        }
        connect().catch((e) => console.log('Reconnect error: ' + e.message));
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        if (!m.message) continue;
        try {
          await onMessage(sock, m);
        } catch (e) {
          console.log('Message error: ' + e.message);
        }
      }
    });
  };

  await connect();
}

module.exports = { startBot };
