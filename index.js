import express from "express";
import pino from "pino";
import fs from "node:fs/promises";
import path from "node:path";
import * as BaileysModule from "@whiskeysockets/baileys";

const Baileys = BaileysModule.makeWASocket
  ? BaileysModule
  : (BaileysModule.default || BaileysModule);
const makeWASocket = typeof Baileys === "function"
  ? Baileys
  : (Baileys.makeWASocket || Baileys.default);
const DisconnectReason = Baileys.DisconnectReason || BaileysModule.DisconnectReason;
const useMultiFileAuthState = Baileys.useMultiFileAuthState || BaileysModule.useMultiFileAuthState;
const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion || BaileysModule.fetchLatestBaileysVersion;
const fetchLatestWaWebVersion = Baileys.fetchLatestWaWebVersion || BaileysModule.fetchLatestWaWebVersion;
const Browsers = Baileys.Browsers || BaileysModule.Browsers;
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import { handleMessage } from "./handler.js";
import { loadCommands } from "./plugins/index.js";
import { registerWeb } from "./web.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
let sock = null;
let pairingInProgress = false;
let lastPairingCode = null;
let connectedAt = null;
let startPromise = null;
let resetting = false;

// --- FIX FOR RAILWAY/RENDER PERMISSION ERROR ---
// Agar config me /app likha bhi ho to hum usko sahi kar denge
function getSafeAuthDir() {
  let dir = config.authDir || "./auth";
  // Agar /app se start ho raha hai to usko relative bana do
  if (dir.startsWith("/app")) {
    dir = "./auth";
  }
  // Hamesha project folder ke andar banao
  return path.isAbsolute(dir) ? path.join(process.cwd(), path.basename(dir)) : path.join(process.cwd(), dir);
}

const AUTH_DIR = getSafeAuthDir();

const app = express();
app.use(express.json({ limit: "1mb" }));
registerWeb(app, () => ({
  connected: Boolean(sock?.user),
  user: sock?.user || null,
  pairingInProgress,
  lastPairingCode
}));

app.listen(config.port, "0.0.0.0", () => {
  logger.info(`SHADOW MD web server listening on ${config.port} | AuthDir: ${AUTH_DIR}`);
});

async function startBot() {
  if (startPromise) return startPromise;
  startPromise = (async () => {
  await loadCommands();
  if (typeof makeWASocket !== "function") {
    throw new Error("Baileys socket factory was not loaded. Reinstall dependencies and redeploy.");
  }
  await fs.mkdir(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try {
    if (typeof fetchLatestWaWebVersion === "function") {
      ({ version } = await fetchLatestWaWebVersion({}));
    }
  } catch (err) {
    logger.warn({ err }, "Could not fetch current WhatsApp Web version; trying Baileys version helper");
  }
  if (!version) {
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      version = undefined;
    }
  }

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: typeof Browsers?.macOS === "function" ? Browsers.macOS("Chrome") : ["Mac OS", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    markOnlineOnConnect: false,
    syncFullHistory: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      connectedAt = Date.now();
      pairingInProgress = false;
      lastPairingCode = null;
      logger.info("SHADOW MD connected");
      try {
        await sock.sendMessage(sock.user.id, {
          text: `🟢 *${config.botName} ONLINE*\n\nOwner: ${config.ownerName}\nPrefix: ${config.prefix}\nVersion: ${config.version}`
        });
      } catch {}
    }

    if (connection === "close") {
      if (resetting) return;
      const statusCode = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({ statusCode, loggedOut }, "WhatsApp connection closed");
      sock = null;
      if (!loggedOut) setTimeout(startBot, 5000);
      else logger.error("Logged out. Clear the auth folder before pairing again.");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      try {
        await handleMessage(sock, message);
      } catch (err) {
        logger.error({ err }, "Message handler error");
      }
    }
  });
  })();
  try { return await startPromise; } finally { startPromise = null; }
}

async function resetSession() {
  resetting = true;
  pairingInProgress = false;
  lastPairingCode = null;
  const old = sock;
  sock = null;
  if (old) {
    try { old.end(new Error("Session reset for pairing")); } catch {}
  }
  await new Promise(r => setTimeout(r, 500));
  await fs.rm(AUTH_DIR, { recursive: true, force: true });
  await fs.mkdir(AUTH_DIR, { recursive: true });
  resetting = false;
}

export async function requestPairing(number, forceReset = false) {
  const clean = String(number || "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(clean)) throw new Error("Enter a valid international number without +, spaces or dashes.");

  if (sock?.user && !forceReset) {
    return { connected: true, code: null, needsReset: true };
  }

  if (forceReset) await resetSession();
  if (!sock) await startBot();

  if (sock.user && !forceReset) return { connected: true, code: null, needsReset: true };
  await new Promise(resolve => setTimeout(resolve, 1800));
  if (!sock || resetting) throw new Error("Pairing socket was reset. Please generate a new code.");
  pairingInProgress = true;
  const code = await sock.requestPairingCode(clean);
  lastPairingCode = code;
  return { connected: false, code, needsReset: false };
}

app.post("/api/pair", async (req, res) => {
  try {
    const result = await requestPairing(req.body?.number, Boolean(req.body?.reset));
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || "Pairing failed" });
  }
});

startBot().catch(err => logger.error({ err }, "Initial bot start failed"));