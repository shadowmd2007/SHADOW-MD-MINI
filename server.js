
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import pino from 'pino';
import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 8080);
const AUTH_DIR = path.resolve(
  __dirname,
  process.env.AUTH_DIR || config.authDir || './auth'
);
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' });

let socket = null;
let pairingInProgress = false;
let currentStatus = 'DISCONNECTED';
let reconnectTimer = null;
let reconnectAttempts = 0;

app.use(express.json({ limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/info', (_req, res) => {
  res.json({
    botName: config.botName,
    ownerName: config.ownerName,
    image: config.botImage || config.menuImage,
    botImage: config.botImage || config.menuImage,
    ok: true
  });
});

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    status: currentStatus,
    connected: currentStatus === 'CONNECTED'
  });
});

app.get('/api/status', (_req, res) => {
  res.json({
    status: currentStatus,
    connected: currentStatus === 'CONNECTED',
    botName: config.botName || 'WhatsApp Bot'
  });
});

app.use(express.static(path.join(__dirname, 'public')));

async function createSocket(state, saveCreds) {
  const { version } = await fetchLatestBaileysVersion();

  const newSocket = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    browser: [config.botName || 'SHADOW MD', 'Chrome', '1.0.0'],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    syncFullHistory: false
  });

  socket = newSocket;
  currentStatus = 'CONNECTING';

  newSocket.ev.on('creds.update', saveCreds);

  newSocket.ev.on('connection.update', async (update) => {
    if (socket !== newSocket) return;

    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      currentStatus = 'CONNECTED';
      reconnectAttempts = 0;
      console.log('WhatsApp connected successfully.');
    }

    if (connection === 'connecting') {
      currentStatus = 'CONNECTING';
    }

    if (connection === 'close') {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode;

      const loggedOut = statusCode === DisconnectReason.loggedOut;

      socket = null;
      currentStatus = 'DISCONNECTED';

      console.error(
        'WhatsApp connection closed. Status:',
        statusCode || 'unknown'
      );

      if (loggedOut) {
        console.error(
          'WhatsApp session logged out. Pair again to reconnect.'
        );
        return;
      }

      scheduleReconnect();
    }
  });

  return newSocket;
}

function scheduleReconnect() {
  if (reconnectTimer) return;

  reconnectAttempts += 1;

  const delay = Math.min(
    3000 * reconnectAttempts,
    30000
  );

  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;

    try {
      fs.mkdirSync(AUTH_DIR, { recursive: true });

      const { state, saveCreds } =
        await useMultiFileAuthState(AUTH_DIR);

      if (!state.creds.registered) {
        currentStatus = 'DISCONNECTED';
        return;
      }

      if (socket) return;

      console.log('Attempting WhatsApp reconnection...');
      await createSocket(state, saveCreds);
    } catch (error) {
      console.error(
        'Reconnect error:',
        error?.message || error
      );

      currentStatus = 'DISCONNECTED';
      scheduleReconnect();
    }
  }, delay);
}

app.post('/api/pair', async (req, res) => {
  const number = String(req.body?.number || '').replace(/\D/g, '');

  if (number.length < 10 || number.length > 15) {
    return res.status(400).json({
      error: 'Country code ke sath valid WhatsApp number likhein.'
    });
  }

  if (pairingInProgress) {
    return res.status(429).json({
      error: 'Pairing already in progress. Kuch seconds baad try karein.'
    });
  }

  if (socket && currentStatus !== 'DISCONNECTED') {
    return res.status(409).json({
      error: 'WhatsApp connection pehle se active ya connecting hai.'
    });
  }

  pairingInProgress = true;
  let newSocket = null;

  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    if (state.creds.registered) {
      if (!socket) {
        newSocket = await createSocket(state, saveCreds);
      }

      return res.status(409).json({
        status: currentStatus.toLowerCase(),
        message:
          'Saved WhatsApp session mil gaya. Existing session connect ho raha hai.'
      });
    }

    const { version } = await fetchLatestBaileysVersion();

    newSocket = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      browser: [config.botName || 'SHADOW MD', 'Chrome', '1.0.0'],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      syncFullHistory: false
    });

    socket = newSocket;
    currentStatus = 'CONNECTING';

    newSocket.ev.on('creds.update', saveCreds);

    newSocket.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (socket !== newSocket) return;

      if (connection === 'open') {
        currentStatus = 'CONNECTED';
        reconnectAttempts = 0;
        console.log('WhatsApp connected successfully.');
      } else if (connection === 'connecting') {
        currentStatus = 'CONNECTING';
      } else if (connection === 'close') {
        const statusCode =
          lastDisconnect?.error?.output?.statusCode;

        socket = null;
        currentStatus = 'DISCONNECTED';

        if (statusCode !== DisconnectReason.loggedOut) {
          scheduleReconnect();
        }
      }
    });

    const raw = await newSocket.requestPairingCode(number);
    const code = raw.match(/.{1,4}/g)?.join('-') || raw;

    return res.json({
      status: 'pairing',
      code,
      message:
        'WhatsApp > Linked Devices > Link with phone number mein code enter karein.'
    });
  } catch (error) {
    console.error(
      'Pairing error:',
      error?.stack || error?.message || error
    );

    if (socket === newSocket) {
      socket = null;
      currentStatus = 'DISCONNECTED';
    }

    try {
      newSocket?.end?.(undefined);
    } catch {}

    return res.status(500).json({
      error: 'Pairing code nahi mil saka. Railway logs check karein.'
    });
  } finally {
    pairingInProgress = false;
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(
    `${config.botName || 'WhatsApp bot'} server listening on ${PORT}`
  );

  startSavedSession();
});

async function startSavedSession() {
  try {
    fs.mkdirSync(AUTH_DIR, { recursive: true });

    const { state, saveCreds } =
      await useMultiFileAuthState(AUTH_DIR);

    if (state.creds.registered) {
      console.log('Saved WhatsApp session found.');
      await createSocket(state, saveCreds);
    } else {
      console.log('No saved WhatsApp session. Pair the bot first.');
    }
  } catch (error) {
    console.error(
      'Startup connection error:',
      error?.message || error
    );

    currentStatus = 'DISCONNECTED';
  }
}

export default app;