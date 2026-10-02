import express from "express";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import { config } from "./config.js";
import { handleMessage } from "./handler.js";
import { registerWeb } from "./web.js";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });
let sock = null;
let pairingInProgress = false;
let lastPairingCode = null;
let connectedAt = null;

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
}

export async function requestPairing(number) {
  const clean = String(number || "").replace(/\D/g, "");
  if (!/^\d{8,15}$/.test(clean)) throw new Error("Enter a valid international number without +, spaces or dashes.");

  if (!sock) await startBot();
  if (sock.user) return { connected: true, code: null };

  pairingInProgress = true;
  const code = await sock.requestPairingCode(clean);
  lastPairingCode = code;
  return { connected: false, code };
}

app.post("/api/pair", async (req, res) => {
  try {
    const result = await requestPairing(req.body?.number);
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message || "Pairing failed" });
  }
});

startBot().catch(err => logger.error({ err }, "Initial bot start failed"));
