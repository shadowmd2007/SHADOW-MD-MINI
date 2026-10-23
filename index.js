import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pino from "pino";
import pkg from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeWASocket = pkg.default || pkg.makeWASocket;
const { useMultiFileAuthState, Browsers, delay, DisconnectReason, fetchLatestBaileysVersion } = pkg;

const app = express();
const PORT = process.env.PORT || 10000;
const SESSIONS_DIR = path.join(__dirname, "sessions");

// Server crash na ho
process.on("uncaughtException", (e) => console.error("UNCAUGHT:", e?.message || e));
process.on("unhandledRejection", (e) => console.error("UNHANDLED:", e?.message || e));

// phone -> { sock, dir, timer, closed, linked }
const sessions = new Map();

function cleanDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
}

function closeSession(phone) {
  const s = sessions.get(phone);
  if (!s) return;
  s.closed = true;
  clearTimeout(s.timer);
  try { s.sock?.end?.(undefined); } catch (e) {}
  cleanDir(s.dir);
  sessions.delete(phone);
  console.log("Session closed:", phone);
}

async function getVersion() {
  try {
    const { version } = await fetchLatestBaileysVersion();
    return version;
  } catch (e) {
    return undefined;
  }
}

async function createSock(dir, version) {
  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const sock = makeWASocket({
    version,
    auth: state,
    browser: Browsers.macOS("Safari"),
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    markOnlineOnConnect: false
  });
  sock.ev.on("creds.update", saveCreds);
  return { sock, state };
}

function watch(phone, version, sess) {
  const sock = sess.sock;
  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect } = u;

    if (connection === "open") {
      sess.linked = true;
      console.log("CONNECTED:", phone);
      try {
        await delay(4000);
        const myNum = sock.user.id.split(":")[0].split("@")[0];
        const jid = myNum + "@s.whatsapp.net";
        const buf = fs.readFileSync(path.join(sess.dir, "creds.json"));
        await sock.sendMessage(jid, {
          document: buf,
          mimetype: "application/json",
          fileName: "creds.json",
          caption: "SHADOW MD connected successfully!"
        });
        await sock.sendMessage(jid, { text: "SHADOW-MD~" + buf.toString("base64") });
      } catch (e) {
        console.error("SEND ERROR:", e.message);
      }
      await delay(5000);
      closeSession(phone);
      return;
    }

    if (connection === "close") {
      if (sess.closed) return;
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log("Closed with code:", code);
      if (code === DisconnectReason.loggedOut) return closeSession(phone);
      // Pairing ke baad restartRequired (515) normal hai -> reconnect
      try {
        const { sock: s2 } = await createSock(sess.dir, version);
        sess.sock = s2;
        watch(phone, version, sess);
      } catch (e) {
        console.error("RECONNECT ERROR:", e.message);
        closeSession(phone);
      }
    }
  });
}

// Project folder public nahi hoga, sirf "public" folder
app.use(express.static(path.join(__dirname, "public"), { index: false }));

app.get("/health", (req, res) => res.send("OK"));

app.get("/", async (req, res) => {
  const num = req.query.number;
  if (!num) return res.sendFile(path.join(__dirname, "index.html"));

  const phone = String(num).replace(/[^0-9]/g, "");
  if (phone.length < 8 || phone.length > 15) {
    return res.json({ error: "Number galat hai (country code ke saath, bina + ya 0)" });
  }

  try {
    console.log("Trying for:", phone);
    if (sessions.has(phone)) closeSession(phone);

    const dir = path.join(SESSIONS_DIR, phone);
    cleanDir(dir);
    fs.mkdirSync(dir, { recursive: true });

    const version = await getVersion();
    const { sock, state } = await createSock(dir, version);

    const sess = { sock, dir, closed: false, linked: false };
    sess.timer = setTimeout(() => {
      if (!sess.linked) closeSession(phone); // 3 min me link na ho to band
    }, 3 * 60 * 1000);
    sessions.set(phone, sess);
    watch(phone, version, sess);

    await delay(4000);
    if (state.creds.registered) {
      closeSession(phone);
      return res.json({ error: "Ye number pehle se registered hai, dobara try karo" });
    }

    let code = await sock.requestPairingCode(phone);
    code = code.match(/.{1,4}/g).join("-");
    console.log("SUCCESS CODE:", code);
    return res.json({ code });
  } catch (e) {
    console.error("ERROR:", e.message);
    closeSession(phone);
    return res.json({ error: e.message });
  }
});

app.listen(PORT, () => console.log("SHADOW MD LIVE ON", PORT));
