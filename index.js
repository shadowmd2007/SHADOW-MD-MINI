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

/* ───────────── Baileys loader ─────────────
   Baileys 6.x is CommonJS. Importing it with ESM `import x from` can give the
   whole exports object instead of the function ("makeWASocket is not a
   function"). So load it with require() first and look in every place the
   function can live. */
let baileysCache = null;
async function getBaileys() {
  if (baileysCache) return baileysCache;
  let mod;
  try {
    mod = require("@whiskeysockets/baileys");
  } catch {
    mod = await import("@whiskeysockets/baileys");
  }
  const pick = (name) => mod[name] ?? mod.default?.[name];
  const makeWASocket = [mod.makeWASocket, mod.default, mod.default?.makeWASocket, mod.default?.default].find(
    (c) => typeof c === "function"
  );
  if (!makeWASocket) {
    throw new Error(`Baileys loaded but makeWASocket was not found. Exports: ${Object.keys(mod).join(", ")}`);
  }
  baileysCache = {
    makeWASocket,
    DisconnectReason: pick("DisconnectReason") || { loggedOut: 401, connectionReplaced: 440 },
    useMultiFileAuthState: pick("useMultiFileAuthState"),
    fetchLatestBaileysVersion: pick("fetchLatestBaileysVersion"),
    fetchLatestWaWebVersion: pick("fetchLatestWaWebVersion"),
    Browsers: pick("Browsers")
  };
  if (typeof baileysCache.useMultiFileAuthState !== "function") {
    baileysCache = null;
    throw new Error("Baileys loaded but useMultiFileAuthState was not found.");
  }
  return baileysCache;
}

async function resolveVersion(b) {
  try {
    if (typeof b.fetchLatestWaWebVersion === "function") {
      const { version } = await b.fetchLatestWaWebVersion({});
      if (version) return version;
    }
  } catch (err) {
    logger.warn({ err }, "Could not fetch current WhatsApp Web version");
  }
  try {
    if (typeof b.fetchLatestBaileysVersion === "function") {
      const { version } = await b.fetchLatestBaileysVersion();
      if (version) return version;
    }
  } catch {
    /* use Baileys default */
  }
  return undefined;
}

/* ───────────── State ───────────── */
let sock = null;
let startPromise = null;
let resetting = false;
let pairingInProgress = false;
let lastPairingCode = null;
let readyForPairing = false;
let reconnectTimer = null;
let reconnectAttempts = 0;

/* ───────────── Web server ───────────── */
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

/* ───────────── Bot ───────────── */
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
      browser: typeof b.Browsers?.macOS === "function" ? b.Browsers.macOS("Chrome") : ["Mac OS", "Chrome", "1.0.0"],
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 25000,
      markOnlineOnConnect: false,
      syncFullHistory: false
    });
    sock = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (socket !== sock) return; // ignore events from an old socket
      if (qr) readyForPairing = true;

      if (connection === "open") {
        reconnectAttempts = 0;
        pairingInProgress = false;
        lastPairingCode = null;
        logger.info("SHADOW MD connected");
        try {
          await socket.sendMessage(toJid(socket.user.id), {
            text:
              `🟢 *${config.botName} ONLINE*\n\n` +
              `Owner: ${config.ownerName}\n` +
              `Prefix: ${config.prefix}\n` +
              `Version: ${config.version}`
          });
        } catch {
          /* not important */
        }
      }

      if (connection === "close") {
        if (resetting) return;
        const code = lastDisconnect?.error?.output?.statusCode;
        sock = null;
        readyForPairing = false;
        logger.warn({ statusCode: code }, "WhatsApp connection closed");

        if (code === b.DisconnectReason.loggedOut) {
          logger.error("Logged out from WhatsApp. Clearing saved login so you can pair again from the web page.");
          await fs.rm(config.authDir, { recursive: true, force: true }).catch(() => {});
          scheduleRestart(2000);
        } else if (code === b.DisconnectReason.connectionReplaced) {
          logger.error(
            "Connection replaced (440): this WhatsApp login is open somewhere else. " +
              "Make sure only ONE Railway project/deployment uses this number. Not reconnecting."
          );
        } else {
          scheduleRestart(Math.min(5000 * 2 ** reconnectAttempts++, 60000));
        }
      }
    });

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      for (const message of messages) {
        const fromMe = Boolean(message.key?.fromMe);
        // "notify" = live messages. Some WhatsApp versions deliver recent incoming
        // messages as "append"; the bot's own replies also arrive as "append"
        // (fromMe), so those are skipped to avoid loops.
        if (type !== "notify" && !(type === "append" && !fromMe)) {
          logger.info({ type, fromMe }, "upsert skipped");
          continue;
        }
        try {
          await handleMessage(socket, message);
        } catch (err) {
          logger.error({ err }, "Message handler error");
        }
      }
    });
  })();
  try {
    await startPromise;
  } finally {
    startPromise = null;
  }
}

async function resetSession() {
  resetting = true;
  clearTimeout(reconnectTimer);
  pairingInProgress = false;
  lastPairingCode = null;
  readyForPairing = false;
  const old = sock;
  sock = null;
  if (old) {
    try {
      old.end(new Error("Session reset for pairing"));
    } catch {
      /* ignore */
    }
  }
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
  if (!/^\d{8,15}$/.test(clean)) throw new Error("Enter a valid international number without +, spaces or dashes.");

  if (!forceReset && (sock?.user || sock?.authState?.creds?.registered)) {
    return { connected: Boolean(sock?.user), code: null, needsReset: true };
  }

  if (forceReset) await resetSession();
  if (!sock) await startBot();

  const current = sock;
  if (!current) throw new Error("Bot is not ready yet. Wait a few seconds and try again.");

  await waitForPairingReady();
  if (sock !== current || resetting) throw new Error("Pairing socket was reset. Please generate a new code.");
  if (current.authState?.creds?.registered) return { connected: Boolean(current.user), code: null, needsReset: true };

  pairingInProgress = true;
  try {
    const code = await current.requestPairingCode(clean);
    lastPairingCode = code;
    return { connected: false, code, needsReset: false };
  } catch (err) {
    pairingInProgress = false;
    throw err;
  }
}

app.post("/api/pair", async (req, res) => {
  try {
    const result = await requestPairing(req.body?.number, Boolean(req.body?.reset));
    res.json({ ok: true, ...result });
  } catch (e) {
    logger.error({ err: e }, "Pairing request failed");
    res.status(400).json({ ok: false, error: e?.message || "Pairing failed" });
  }
});

process.on("unhandledRejection", (err) => logger.error({ err }, "Unhandled rejection"));
process.on("uncaughtException", (err) => logger.error({ err }, "Uncaught exception"));

startBot().catch((err) => {
  logger.error({ err }, "Initial bot start failed");
  scheduleRestart(30000);
});
