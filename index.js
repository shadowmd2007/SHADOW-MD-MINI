import express from "express";
import pino from "pino";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { config } from "./config.js";
import { handleMessage } from "./handler.js";
import { loadCommands } from "./commands.js";
import { registerWeb } from "./web.js";
import { sleep, toJid } from "./utils.js";

const require = createRequire(import.meta.url);
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
const baileysLogger = pino({ level: process.env.BAILEYS_LOG_LEVEL || "warn" });

let baileysCache = null;
async function getBaileys() {
  if (baileysCache) return baileysCache;
  let mod;
  try { mod = require("@whiskeysockets/baileys"); }
  catch { mod = await import("@whiskeysockets/baileys"); }
  const pick = (name) => mod[name]?? mod.default?.[name];
  const makeWASocket = [mod.makeWASocket, mod.default, mod.default?.makeWASocket].find(c => typeof c === "function");
  baileysCache = {
    makeWASocket,
    DisconnectReason: pick("DisconnectReason") || { loggedOut: 401, connectionReplaced: 440 },
    useMultiFileAuthState: pick("useMultiFileAuthState"),
    fetchLatestBaileysVersion: pick("fetchLatestBaileysVersion"),
    fetchLatestWaWebVersion: pick("fetchLatestWaWebVersion"),
    Browsers: pick("Browsers")
  };
  return baileysCache;
}

async function resolveVersion(b) {
  try {
    if (typeof b.fetchLatestWaWebVersion === "function") {
      const { version } = await b.fetchLatestWaWebVersion({});
      if (version) return version;
    }
  } catch {}
  try {
    if (typeof b.fetchLatestBaileysVersion === "function") {
      const { version } = await b.fetchLatestBaileysVersion();
      if (version) return version;
    }
  } catch {}
  return undefined;
}

let sock = null; let startPromise = null; let resetting = false;
let pairingInProgress = false; let lastPairingCode = null;
let readyForPairing = false; let reconnectTimer = null; let reconnectAttempts = 0;

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

function scheduleRestart(ms) {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    startBot().catch((err) => {
      logger.error({ err }, "Restart failed");
      scheduleRestart(Math.min(5000 * 2 ** reconnectAttempts++, 60000));
    });
  }, ms);
}

async function startBot() {
  if (startPromise) return startPromise;
  startPromise = (async () => {
    const b = await getBaileys();
    await loadCommands();
    await fs.mkdir(config.authDir, { recursive: true });
    const { state, saveCreds } = await b.useMultiFileAuthState(config.authDir);
    const version = await resolveVersion(b);
    readyForPairing = false;

    const socket = b.makeWASocket({
      version,
      auth: state,
      logger: baileysLogger,
      printQRInTerminal: false,
      browser: ["Chrome", "Mac OS", "121.0.0.0"],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      markOnlineOnConnect: true,
      shouldSyncHistoryMessage: () => false,
      syncFullHistory: false,
      fireInitQueries: true,
      emitOwnEvents: false
    });
    sock = socket;
    socket.ev.on("creds.update", saveCreds);
    socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (socket!== sock) return;
      if (qr) readyForPairing = true;
      if (connection === "open") {
        reconnectAttempts = 0; pairingInProgress = false; lastPairingCode = null;
        logger.info("SHADOW MD connected");
        try {
          await socket.sendMessage(toJid(socket.user.id), {
            text: `🟢 *${config.botName} ONLINE*\n\nOwner: ${config.ownerName}\nPrefix: ${config.prefix}\nVersion: ${config.version}`
          });
        } catch {}
      }
      if (connection === "close") {
        if (resetting) return;
        const code = lastDisconnect?.error?.output?.statusCode;
        sock = null; readyForPairing = false;
        if (code === b.DisconnectReason.loggedOut) {
          await fs.rm(config.authDir, { recursive: true, force: true }).catch(() => {});
          scheduleRestart(2000);
        } else if (code!== b.DisconnectReason.connectionReplaced) {
          scheduleRestart(Math.min(5000 * 2 ** reconnectAttempts++, 60000));
        }
      }
    });
    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      for (const message of messages) {
        const fromMe = Boolean(message.key?.fromMe);
        if (type!== "notify" &&!(type === "append" &&!fromMe)) continue;
        try { await handleMessage(socket, message); }
        catch (err) { logger.error({ err }, "Message handler error"); }
      }
    });
  })();
  try { await startPromise; } finally { startPromise = null; }
}

async function resetSession() {
  resetting = true; clearTimeout(reconnectTimer);
  pairingInProgress = false; lastPairingCode = null; readyForPairing = false;
  const old = sock; sock = null;
  if (old) { try { old.end(new Error("Session reset")); } catch {} }
  await sleep(500);
  await fs.rm(config.authDir, { recursive: true, force: true });
  await fs.mkdir(config.authDir, { recursive: true });
  resetting = false;
}

async function waitForPairingReady(timeoutMs = 8000) {
  const start = Date.now();
  while (!readyForPairing && sock && Date.now() - start < timeoutMs) await sleep(250);
  await sleep(500);
}

export async function requestPairing(number, forceReset = false) {
  const clean = String(number || "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(clean)) throw new Error("Enter valid number");
  if (!forceReset && (sock?.user || sock?.authState?.creds?.registered)) {
    return { connected: Boolean(sock?.user), code: null, needsReset: true };
  }
  if (forceReset) await resetSession();
  if (!sock) await startBot();
  const current = sock;
  await waitForPairingReady();
  if (sock!== current || resetting) throw new Error("Socket reset. Try again.");
  if (current.authState?.creds?.registered) return { connected: Boolean(current.user), code: null, needsReset: true };
  pairingInProgress = true;
  try {
    const code = await current.requestPairingCode(clean);
    lastPairingCode = code;
    return { connected: false, code, needsReset: false };
  } catch (err) { pairingInProgress = false; throw err; }
}

app.post("/api/pair", async (req, res) => {
  try {
    const result = await requestPairing(req.body?.number, Boolean(req.body?.reset));
    res.json({ ok: true,...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e?.message || "Pairing failed" });
  }
});

process.on("unhandledRejection", (err) => logger.error({ err }, "Unhandled rejection"));
process.on("uncaughtException", (err) => logger.error({ err }, "Uncaught exception"));
startBot().catch((err) => { logger.error({ err }, "Initial start failed"); scheduleRestart(30000); });