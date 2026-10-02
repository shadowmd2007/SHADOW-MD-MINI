import express from "express";
import pino from "pino";
import fs from "node:fs/promises";
import path from "node:path";
import * as BaileysModule from "@whiskeysockets/baileys";

// Handle both ESM and CommonJS interop shapes used by Baileys releases.
const Baileys = BaileysModule.makeWASocket
  ? BaileysModule
  : (BaileysModule.default || BaileysModule);
const makeWASocket = typeof Baileys === "function"
  ? Baileys
  : (Baileys.makeWASocket || Baileys.default);
const DisconnectReason = Baileys.DisconnectReason || BaileysModule.DisconnectReason;
const useMultiFileAuthState = Baileys.useMultiFileAuthState || BaileysModule.useMultiFileAuthState;
const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion || BaileysModule.fetchLatestBaileysVersion;
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import { handleMessage } from "./handler.js";
import { registerWeb } from "./web.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
let sock = null;
let pairingInProgress = false;
let lastPairingCode = null;
let connectedAt = null;
let startPromise = null;
let resetting = false;

const app = express();
app.use(express.json({ limit: "1mb" }));
registerWeb(app, () => ({
  connected: Boolean(sock?.user),
  user: sock?.user || null,
  pairingInProgress,
  lastPairingCode
}));

app.listen(config.port, "0.0.0.0", () => {
  logger.info(`SHADOW MD web server listening on ${config.port}`);
});

async function startBot() {
  if (startPromise) return startPromise;
  startPromise = (async () => {
  if (typeof makeWASocket !== "function") {
    throw new Error("Baileys socket factory was not loaded. Reinstall dependencies and redeploy.");
  }
  await fs.mkdir(config.authDir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  let version;
  try {
    ({ version } = await fetchLatestBaileysVersion());
  } catch {
    version = undefined;
  }

  sock = makeWASocket({
    version,
    auth: state,
    logger,
    printQRInTerminal: false,
    browser: ["SHADOW MD", "Chrome", "1.0.0"],
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
          text: `🟢 *${config.botName} ONLINE*\\n\\nOwner: ${config.ownerName}\\nPrefix: ${config.prefix}\\nVersion: ${config.version}`
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
      else logger.error("Logged out. Clear the Railway auth volume before pairing again.");
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
  await fs.rm(config.authDir, { recursive: true, force: true });
  await fs.mkdir(config.authDir, { recursive: true });
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

  // Give the new socket a moment to initialize before asking for the code.
  if (sock.user && !forceReset) return { connected: true, code: null, needsReset: true };
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

