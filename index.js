
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath } from 'node:url';

import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';

import { config } from './config.js';
import { onMessage, loadCommands } from './handler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const PORT = Number(process.env.PORT || config.port || 3000);
const AUTH_DIR = path.resolve(__dirname, config.authDir || './auth');
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

let sock = null;
let status = 'DISCONNECTED';
let pairCode = null;
let starting = false;
let reconnectTimer = null;
let lastNumber = '';

app.use(express.urlencoded({ extended: false }));
app.use(express.json({ limit: '1mb' }));

function normalizeNumber(value) {
  let number = String(value || '').replace(/\D/g, '');

  if (number.startsWith('0')) {
    number = '92' + number.slice(1);
  }

  return number;
}

function page() {
  const connected = status === 'CONNECTED';

  const shownCode = pairCode
    ? `<div class="code">${pairCode}</div>
       <p>WhatsApp → Linked Devices → Link with phone number</p>`
    : '';

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${config.botName || 'WhatsApp Bot'}</title>
<style>
*{box-sizing:border-box}
body{
  background:#090909;color:#fff;font-family:Arial,sans-serif;
  display:flex;justify-content:center;align-items:center;
  min-height:100vh;margin:0;padding:18px
}
.card{
  width:100%;max-width:390px;text-align:center;
  background:#151515;border:1px solid #e60040;
  border-radius:20px;padding:24px;
  box-shadow:0 0 20px #e6004033
}
.dp{
  width:100px;height:100px;border-radius:50%;
  object-fit:cover;border:2px solid #e60040
}
input,button{
  width:100%;padding:13px;border-radius:10px;margin-top:12px
}
input{
  background:#222;color:white;border:1px solid #e60040;
  text-align:center
}
button{
  border:0;background:#e60040;color:white;font-weight:bold;
  cursor:pointer
}
.code{
  font-size:32px;letter-spacing:4px;color:#00ff9d;
  padding:14px;background:#050505;border:1px dashed #00ff9d;
  border-radius:10px;margin-top:16px
}
.status{
  color:${connected ? '#00ff88' : '#ff5577'};
  font-weight:bold
}
a{color:#ddd}
small{color:#888}
</style>
</head>
<body>
<main class="card">
<img class="dp" src="${config.botImage || ''}" alt="Bot">
<h2>${config.botName || 'WhatsApp Bot'}</h2>
<p>${config.ownerName || ''}</p>
<p class="status">${status}</p>
${
  connected
    ? '<h3>WhatsApp connected</h3>'
    : `<form action="/pair" method="post">
       <input name="num" inputmode="numeric"
       placeholder="92300XXXXXXXX"
       value="${lastNumber || config.ownerNumber || ''}" required>
       <button type="submit">GET PAIRING CODE</button>
       </form>${shownCode}`
}
<p><small>v${config.version || '1.0.0'}</small></p>
<p><a href="/health">Health status</a></p>
</main>
</body>
</html>`;
}

app.get('/', (_req, res) => {
  res.type('html').send(page());
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    status,
    connected: status === 'CONNECTED'
  });
});

async function closeSocket() {
  const old = sock;
  sock = null;

  if (old) {
    try {
      old.ev.removeAllListeners('connection.update');
    } catch {}

    try {
      old.ev.removeAllListeners('messages.upsert');
    } catch {}

    try {
      old.end(undefined);
    } catch {}
  }
}

async function connectWhatsApp(number = '') {
  if (starting) return;

  starting = true;
  clearTimeout(reconnectTimer);

  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    const { version } = await fetchLatestBaileysVersion();

    const current = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,

      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },

      browser: [
        config.botName || 'SHADOW MD',
        'Chrome',
        '1.0.0'
      ],

      markOnlineOnConnect: true,
      syncFullHistory: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000
    });

    sock = current;

    current.ev.on('creds.update', saveCreds);

    current.ev.on('messages.upsert', async (upsert) => {
      if (sock !== current) return;

      try {
        await onMessage(current, upsert);
      } catch (error) {
        console.error(
          'Message handler failed:',
          error?.message || error
        );
      }
    });

    current.ev.on(
      'connection.update',
      ({ connection, lastDisconnect }) => {
        if (sock !== current) return;

        if (connection === 'open') {
          status = 'CONNECTED';
          pairCode = null;

          console.log(
            `${config.botName || 'Bot'} connected to WhatsApp.`
          );

        } else if (connection === 'connecting') {
          status = 'CONNECTING';

        } else if (connection === 'close') {
          status = 'DISCONNECTED';

          const code =
            lastDisconnect?.error?.output?.statusCode;

          console.error(
            'WhatsApp connection closed; status code:',
            code ?? 'unknown'
          );

          sock = null;

          if (code !== DisconnectReason.loggedOut) {
            reconnectTimer = setTimeout(() => {
              connectWhatsApp();
            }, 3000);
          } else {
            console.error(
              'WhatsApp logged out. Re-pair only if you intend to link again.'
            );
          }
        }
      }
    );

    // Request a pairing code only for an unregistered session.
    if (number && !state.creds.registered) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (sock === current && !state.creds.registered) {
        const rawCode =
          await current.requestPairingCode(number);

        pairCode =
          rawCode.match(/.{1,4}/g)?.join('-') || rawCode;
      }
    }

    // Load or refresh commands from handler.js.
    await loadCommands();

  } catch (error) {
    status = 'DISCONNECTED';

    console.error(
      'WhatsApp startup/pairing failed:',
      error?.stack || error?.message || error
    );

    if (number) {
      pairCode = 'PAIR ERROR';
    }

  } finally {
    starting = false;
  }
}

app.post('/pair', async (req, res) => {
  const number = normalizeNumber(
    req.body?.num || req.body?.number
  );

  if (!number || number.length < 10) {
    return res.status(400).send(
      'Valid WhatsApp number required. Enter country code + number.'
    );
  }

  lastNumber = number;

  if (status === 'CONNECTED') {
    return res.redirect('/');
  }

  if (sock && status === 'CONNECTING') {
    return res.status(409).send(
      'WhatsApp connection is already starting. Wait a few seconds and refresh.'
    );
  }

  // Never delete saved authentication/session files here.
  await connectWhatsApp(number);

  return res.redirect('/');
});

app.listen(PORT, () => {
  console.log(
    `${config.botName || 'WhatsApp bot'} web server listening on port ${PORT}`
  );
});

// Start with the existing saved session when available.
try {
  await loadCommands();

  if (
    fs.existsSync(AUTH_DIR) &&
    fs.readdirSync(AUTH_DIR).length > 0
  ) {
    await connectWhatsApp();
  } else {
    console.log(
      'No saved WhatsApp session found. Open the site and request a pairing code.'
    );
  }

} catch (error) {
  console.error(
    'Initial startup failed:',
    error?.stack || error?.message || error
  );
}

process.on('SIGINT', async () => {
  clearTimeout(reconnectTimer);
  await closeSocket();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  clearTimeout(reconnectTimer);
  await closeSocket();
  process.exit(0);
});
