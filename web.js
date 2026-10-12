const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');

const app = express();
const PORT = process.env.PORT || 10000;

// Render Disk ho to AUTH_DIR env mein uska path do (e.g. /data/auth)
const AUTH_ROOT = process.env.AUTH_DIR || path.join(__dirname, 'auth');
const MAIN_DIR = path.join(AUTH_ROOT, 'main');

const CODE_VALID_MS = 60000;   // code 1 minute valid
const COOLDOWN_MS = 10000;     // ek number pe 10 sec mein sirf 1 request

const activeCodes = new Map();
const lastRequest = new Map();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

app.use(express.static(__dirname));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.send('OK'));

app.get('/latest', (req, res) => {
  const n = (req.query.number || '').replace(/[^0-9]/g, '');
  const data = activeCodes.get(n);
  res.json({ code: data?.code || null, status: data?.status || 'waiting' });
});

app.get('/pair', async (req, res) => {
  const num = (req.query.number || '').replace(/[^0-9]/g, '');
  if (!num) return res.status(400).send('Number Missing');
  if (num.length < 10) return res.status(400).send('Invalid Number');

  const now = Date.now();
  if (lastRequest.has(num) && now - lastRequest.get(num) < COOLDOWN_MS) {
    return res.status(429).send('Thora ruko, 10 second baad dobara try karo');
  }
  lastRequest.set(num, now);

  // purani koshish band karo, har bar NAYA code banega
  const old = activeCodes.get(num);
  if (old) {
    try { old.sock?.end(); } catch {}
    activeCodes.delete(num);
  }

  const dir = path.join(AUTH_ROOT, num);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(MAIN_DIR, { recursive: true });

  try {
    const B = require('@whiskeysockets/baileys');
    const { version } = await B.fetchLatestBaileysVersion();
    let finished = false;

    const makeSock = async () => {
      const { state, saveCreds } = await B.useMultiFileAuthState(dir);
      const s = B.default({
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
        connectTimeoutMs: 60000,
      });

      s.ev.on('creds.update', saveCreds);

      s.ev.on('connection.update', async (u) => {
        const { connection, lastDisconnect } = u;

        if (connection === 'open' && !finished) {
          finished = true;
          const d = activeCodes.get(num);
          if (d) d.status = 'connected';
          console.log('PAIRED: ' + num);
          await sleep(5000);
          try { s.end(); } catch {}
          await sleep(1000);
          try {
            fs.rmSync(MAIN_DIR, { recursive: true, force: true });
            fs.cpSync(dir, MAIN_DIR, { recursive: true, force: true });
            console.log('Session saved to auth/main');
          } catch (e) {
            console.log('Session copy error: ' + e.message);
          }
        }

        if (connection === 'close' && !finished) {
          const st = lastDisconnect?.error?.output?.statusCode;
          if (st === B.DisconnectReason.restartRequired) {
            console.log('Restart required, reconnecting...');
            try {
              const ns = await makeSock();
              const d = activeCodes.get(num);
              if (d) d.sock = ns;
            } catch (e) {
              console.log('Reconnect error: ' + e.message);
            }
          }
        }
      });

      return s;
    };

    const sock = await makeSock();
    await sleep(3000);
    const rawCode = await sock.requestPairingCode(num);
    const code = rawCode?.match(/.{1,4}/g)?.join('-') || rawCode;

    activeCodes.set(num, { code, status: 'active', sock, expires: now + CODE_VALID_MS });
    res.send(code);

    // 1 minute baad code khatam (10 sec grace taake linking beech mein na kate)
    setTimeout(() => {
      const d = activeCodes.get(num);
      if (d && d.code === code && d.status !== 'connected') {
        try { d.sock?.end(); } catch {}
        activeCodes.delete(num);
      }
    }, CODE_VALID_MS + 10000);
  } catch (e) {
    res.status(500).send('Failed: ' + e.message);
  }
});

app.listen(PORT, () => console.log('SHADOW-MD web live on port ' + PORT));
