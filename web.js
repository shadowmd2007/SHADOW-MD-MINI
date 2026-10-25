import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@whiskeysockets/baileys';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeWASocket = pkg.default || pkg;
const {
useMultiFileAuthState,
Browsers,
DisconnectReason
} = pkg;

const AUTH = path.resolve(
process.env.AUTH_DIR || './auth'
);

let socket = null;
let pairingInProgress = false;

const sleep = ms =>
new Promise(resolve => setTimeout(resolve, ms));

export default async function (app) {
app.get('/', async (req, res) => {
const number = String(req.query.number || '')
.replace(/\D/g, '');

if (!number) {
  return res.sendFile(path.join(__dirname, 'index.html'));
}

if (number.length < 10 || number.length > 15) {
  return res.status(400).json({
    error: 'Phone number galat hai. Country code ke saath likho.'
  });
}

if (pairingInProgress) {
  return res.status(429).json({
    error: 'Pairing already in progress. Thori dair baad try karo.'
  });
}

pairingInProgress = true;

try {
  // Existing session ko delete NAHI karna.
  fs.mkdirSync(AUTH, { recursive: true });

  const { state, saveCreds } =
    await useMultiFileAuthState(AUTH);

  if (state.creds.registered) {
    return res.json({
      status: 'connected',
      message: 'Session pehle se registered hai. Dobara pairing ki zaroorat nahi.'
    });
  }

  const sock = makeWASocket({
    auth: state,
    browser: Browsers.macOS('Safari'),
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000
  });

  socket = sock;

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', update => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      console.log('WhatsApp connected successfully.');
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      console.log('WhatsApp connection closed:', statusCode);

      if (
        statusCode !== DisconnectReason.loggedOut &&
        socket === sock
      ) {
        socket = null;
        console.log('Reconnect required. Check Railway logs.');
      }
    }
  });

  await sleep(1500);

  if (sock.user) {
    return res.json({
      status: 'connected',
      message: 'WhatsApp already connected.'
    });
  }

  const code = await sock.requestPairingCode(number);

  return res.json({
    status: 'pairing',
    code: code.match(/.{1,4}/g)?.join('-') || code,
    message: 'WhatsApp mein Linked Devices khol kar pairing code enter karo.'
  });

} catch (error) {
  console.error('Pairing error:', error.message);

  return res.status(500).json({
    error: 'Pairing fail hui. Railway Logs check karo.',
    details: error.message
  });
} finally {
  pairingInProgress = false;
}

});
}

export function getSocket() {
return socket;
}