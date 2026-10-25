
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@whiskeysockets/baileys';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeWASocket = pkg.default || pkg;
const { useMultiFileAuthState, Browsers, delay } = pkg;

const AUTH = process.env.AUTH_DIR || './auth';

function delAuth() {
  try {
    if (fs.existsSync(AUTH)) {
      fs.rmSync(AUTH, { recursive: true, force: true });
      console.log("Auth deleted - fresh pairing");
    }
  } catch {}
}

export default async function(app) {
  app.get('/', async (req, res) => {
    let num = req.query.number;
    if (!num) {
      return res.sendFile(path.join(__dirname, 'index.html'));
    }

    let phone = num.replace(/[^0-9]/g, "");
    if (phone.length < 10) return res.json({ error: "Number galat hai" });

    delAuth();
    await delay(2000);

    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH);
      const sock = makeWASocket({
        auth: { creds: state.creds, keys: state.keys },
        browser: Browsers.macOS("Safari"),
        logger: pino({ level: "silent" }),
        printQRInTerminal: false
      });

      sock.ev.on("creds.update", saveCreds);
      await delay(4000);

      let code = await sock.requestPairingCode(phone);
      code = code.match(/.{1,4}/g).join("-");
      console.log("PAIR CODE:", code);

      return res.json({ code: code });

    } catch (e) {
      console.log("Pair Error:", e.message);
      return res.json({ error: e.message + " - 10 sec baad try karo" });
    }
  });
}
