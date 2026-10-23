import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@whiskeysockets/baileys';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeWASocket = pkg.default || pkg.makeWASocket || pkg;
const { useMultiFileAuthState, Browsers, delay, makeCacheableSignalKeyStore } = pkg;

const app = express();
const PORT = process.env.PORT || 10000;
const AUTH = './auth';

function cleanAuth() {
  try {
    if (fs.existsSync(AUTH)) {
      fs.rmSync(AUTH, { recursive: true, force: true });
      console.log("Auth cleaned");
    }
  } catch (e) {}
}

app.use(express.json());

app.get('/', async (req, res) => {
  const num = req.query.number;
  
  if (!num) {
    const htmlPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(htmlPath)) {
      return res.sendFile(htmlPath);
    } else {
      return res.send(`
        <h2>SHADOW MD MINI</h2>
        <form method="get">
          <input name="number" placeholder="923xxxxxxxxx" />
          <button>Get Pair Code</button>
        </form>
      `);
    }
  }

  let phone = num.replace(/[^0-9]/g, "");
  console.log("Pair request for:", phone);

  cleanAuth();
  await delay(2000);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH);
    
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({level:"silent"}))
      },
      browser: Browsers.macOS("Safari"),
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);

    await delay(3500);

    if (!sock.authState.creds.registered) {
      let code = await sock.requestPairingCode(phone);
      code = code.match(/.{1,4}/g).join("-");
      console.log("CODE GENERATED:", code);
      return res.json({ code: code, message: "Code ko WhatsApp me dalo - Settings > Linked Devices" });
    } else {
      return res.json({ error: "Already registered, auth delete karo" });
    }

  } catch (e) {
    console.log("PAIR FAIL:", e.message);
    cleanAuth();
    return res.json({ error: e.message + " - 15 sec baad retry karo" });
  }
});

app.listen(PORT, () => {
  console.log(`LIVE ON PORT ${PORT}`);
});