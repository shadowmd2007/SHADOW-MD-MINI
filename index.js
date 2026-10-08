import http from "http";
import fs from "fs";
import { config } from "./config.js";
import { handleMessage } from "./handler.js";

// Load Baileys safely (fixes "makeWASocket not found")
let baileys;
for (const p of ["@whiskeysockets/baileys", "baileys", "@adiwajshing/baileys"]) {
  try { baileys = await import(p); break; } catch {}
}
if (!baileys) { console.error("❌ Baileys package install nahi hai: npm i @whiskeysockets/baileys"); process.exit(1); }
const makeWASocket = baileys.default?.default || baileys.makeWASocket || baileys.default;
const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = baileys;

const noop = () => {};
const logger = { level: "silent", trace: noop, debug: noop, info: noop, warn: noop, error: noop, fatal: noop, child() { return logger; } };

const AUTH = process.env.AUTH_DIR || (fs.existsSync("/app/data") ? "/app/data/shadow-auth" : "./data/shadow-auth");
const PORT = process.env.PORT || 3000;
const BOT = config.botName || "SHADOW-MD-MINI";
fs.mkdirSync(AUTH, { recursive: true });

let sock = null, connected = false, startedAt = 0, starting = false;

async function start() {
  if (starting) return;
  starting = true;
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH);
    let version;
    try { ({ version } = await fetchLatestBaileysVersion()); } catch {}
    startedAt = Date.now();
    sock = makeWASocket({
      version, auth: state, logger,
      printQRInTerminal: false,
      browser: Browsers?.ubuntu ? Browsers.ubuntu("Chrome") : ["Ubuntu", "Chrome", "22.04.4"],
      markOnlineOnConnect: false, syncFullHistory: false,
    });
    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
      if (connection === "open") { connected = true; console.log("✅ WhatsApp connected:", sock.user?.id); }
      if (connection === "close") {
        connected = false;
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log("⚠️ Connection closed, code:", code);
        if (code === DisconnectReason.loggedOut) {
          console.log("🔒 Logged out — session clear ho rahi hai, dobara pair karein.");
          fs.rmSync(AUTH, { recursive: true, force: true });
          fs.mkdirSync(AUTH, { recursive: true });
        }
        starting = false;
        setTimeout(start, 3000);
      }
    });
    sock.ev.on("messages.upsert", ({ messages, type }) => {
      if (type !== "notify") return;
      for (const m of messages) handleMessage(sock, m).catch((e) => console.log("upsert error:", e));
    });

    // Optional: auto pairing code in logs if PAIR_NUMBER env is set
    if (!state.creds.registered && process.env.PAIR_NUMBER) {
      setTimeout(async () => {
        try { console.log("🔑 PAIRING CODE:", await sock.requestPairingCode(process.env.PAIR_NUMBER.replace(/\D/g, ""))); }
        catch (e) { console.log("pair error:", e.message); }
      }, 4000);
    }
  } catch (e) {
    console.log("start error:", e);
    starting = false;
    setTimeout(start, 5000);
    return;
  }
  starting = false;
}

const PAGE = `<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><title>${BOT}</title>
<body style="font-family:sans-serif;background:#111;color:#eee;text-align:center;padding:30px">
<h2>${BOT}</h2><p id=s>...</p>
<input id=n placeholder="923001234567" style="padding:10px;font-size:16px"><br><br>
<button onclick="p()" style="padding:10px 20px;font-size:16px">Get Pairing Code</button>
<h1 id=c style="letter-spacing:4px"></h1>
<script>
fetch('/api/status').then(r=>r.json()).then(d=>s.textContent=d.connected?'✅ Connected':'❌ Not connected');
async function p(){c.textContent='...';const r=await fetch('/api/pair?number='+encodeURIComponent(n.value));const d=await r.json();c.textContent=d.code||d.error}
</script>`;

http.createServer(async (req, res) => {
  const u = new URL(req.url, "http://x");
  const json = (o, s = 200) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
  if (u.pathname === "/api/status") return json({ connected, uptime: process.uptime() });
  if (u.pathname === "/api/pair") {
    try {
      const number = (u.searchParams.get("number") || "").replace(/\D/g, "");
      if (number.length < 8) return json({ error: "Number country code ke saath dein (923001234567)" }, 400);
      if (connected || sock?.authState?.creds?.registered) return json({ error: "Bot already connected hai." }, 400);
      if (Date.now() - startedAt < 3000) await new Promise((r) => setTimeout(r, 3000));
      return json({ code: await sock.requestPairingCode(number) });
    } catch (e) { return json({ error: e.message }, 500); }
  }
  res.writeHead(200, { "content-type": "text/html" }); res.end(PAGE);
}).listen(PORT, () => console.log("🌐 Web server port", PORT));

process.on("unhandledRejection", (e) => console.log("unhandledRejection:", e?.message || e));
process.on("uncaughtException", (e) => console.log("uncaughtException:", e?.message || e));

start();