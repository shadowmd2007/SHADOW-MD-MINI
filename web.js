
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
let activeOwnerJid = null;

const notifiedSockets = new WeakSet();

const sleep = ms =>
  new Promise(resolve => setTimeout(resolve, ms));

function normalizeNumber(number) {
  return String(number || '').replace(/\D/g, '');
}

async function sendConnectedNotice(sock, ownerJid) {
  if (!ownerJid || notifiedSockets.has(sock)) return;

  // Prevent duplicate notifications for the same connection.
  notifiedSockets.add(sock);

  try {
    const botJid = sock.user?.id;

    let picture = null;

    try {
      const pictureUrl = await sock.profilePictureUrl(
        botJid,
        'image'
      );

      const response = await fetch(pictureUrl);

      if (response.ok) {
        picture = Buffer.from(
          await response.arrayBuffer()
        );
      }
    } catch {
      // Continue with text notification if DP is unavailable.
    }

    const message =
      '✅ WhatsApp Bot Connected Successfully!\n\n' +
      '🤖 Your bot is now online.\n' +
      '📱 Pairing and connection completed successfully.';

    if (picture) {
      await sock.sendMessage(ownerJid, {
        image: picture,
        caption: message
      });
    } else {
      await sock.sendMessage(ownerJid, {
        text: message
      });
    }

    console.log('Connection notification sent.');
  } catch (error) {
    console.error(
      'Connection notification error:',
      error.message
    );
  }
}

export default async function (app) {
  app.get('/', async (req, res) => {
    const number = normalizeNumber(req.query.number);

    if (!number) {
      return res.sendFile(
        path.join(__dirname, 'index.html')
      );
    }

    if (number.length < 10 || number.length > 15) {
      return res.status(400).json({
        error:
          'Phone number galat hai. Country code ke saath likho.'
      });
    }

    if (pairingInProgress) {
      return res.status(429).json({
        error:
          'Pairing already in progress. Thori dair baad try karo.'
      });
    }

    if (socket) {
      return res.json({
        status: socket.user ? 'connected' : 'connecting',
        message: socket.user
          ? 'WhatsApp already connected.'
          : 'WhatsApp connection is already in progress.'
      });
    }

    pairingInProgress = true;

    const ownerJid = `${number}@s.whatsapp.net`;

    try {
      fs.mkdirSync(AUTH, { recursive: true });

      const { state, saveCreds } =
        await useMultiFileAuthState(AUTH);

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
      activeOwnerJid = ownerJid;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async update => {
        const { connection, lastDisconnect } = update;

        if (connection === 'open') {
          console.log(
            'WhatsApp connected successfully.'
          );

          await sendConnectedNotice(
            sock,
            activeOwnerJid
          );
        }

        if (connection === 'close') {
          const statusCode =
            lastDisconnect?.error?.output?.statusCode;

          console.log(
            'WhatsApp connection closed:',
            statusCode
          );

          if (socket === sock) {
            socket = null;
            activeOwnerJid = null;
          }

          if (statusCode === DisconnectReason.loggedOut) {
            console.log(
              'WhatsApp logged out. Pair again to reconnect.'
            );
          } else {
            console.log(
              'WhatsApp disconnected. Check the session and reconnect.'
            );
          }
        }
      });

      if (state.creds.registered) {
        return res.json({
          status: 'connecting',
          message:
            'Saved WhatsApp session is being connected. Check Railway Logs.'
        });
      }

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
        message:
          'WhatsApp mein Linked Devices khol kar pairing code enter karo.'
      });

    } catch (error) {
      console.error(
        'Pairing error:',
        error.message
      );

      if (socket) {
        try {
          socket.end(undefined);
        } catch {
          // Ignore cleanup errors.
        }

        socket = null;
        activeOwnerJid = null;
      }

      return res.status(500).json({
        error:
          'Pairing fail hui. Railway Logs check karo.',
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
