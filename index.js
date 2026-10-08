import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, Browsers } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { config } from "./config.js";
import { loadCommands } from "./commands.js";
import { handleMessage } from "./handler.js";

global.botSettings = {
  antidelete: true,
  antiviewonce: true,
  antilink: false,
  antispam: false,
  autoblock: false,
  welcome: false,
  goodbye: false,
  autoreact: false,
  autotyping: false,
  autorecording: false,
  autostatusview: false,
  autostatusreact: false,
  autostatusreply: false,
  antigroupleft: false,
  onlyadmin: false,
  pmblock: false,
  antistatus: false
};

const messageStore = new Map();
const logger = pino({ level: "silent" });

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
  const sock = makeWASocket({
    auth: state,
    logger,
    browser: Browsers.macOS("Chrome"),
    printQRInTerminal: false
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (let msg of messages) {
      if (!msg.message) continue;
      if (msg.key.id) {
        messageStore.set(msg.key.id, {...msg });
        if (messageStore.size > 500) messageStore.delete(messageStore.keys().next().value);
      }

      try {
        if (global.botSettings.antiviewonce && (msg.message?.viewOnceMessage || msg.message?.viewOnceMessageV2)) {
          const inner = msg.message.viewOnceMessage?.message || msg.message.viewOnceMessageV2?.message;
          const type = Object.keys(inner)[0];
          const cap = inner[type]?.caption || "";
          const sender = msg.key.participant || msg.key.remoteJid;
          const remote = msg.key.remoteJid;
          let buffer = await downloadMediaMessage(msg, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
          if (type === "imageMessage") {
            await sock.sendMessage(remote, { image: buffer, caption: `👁️ *ViewOnce Recovered*\n👤 @${sender.split("@")[0]}\n${cap}`, mentions: [sender] });
          } else if (type === "videoMessage") {
            await sock.sendMessage(remote, { video: buffer, caption: `👁️ *ViewOnce Video*\n👤 @${sender.split("@")[0]}\n${cap}`, mentions: [sender] });
          } else if (type === "audioMessage") {
            await sock.sendMessage(remote, { audio: buffer, mimetype: "audio/mp4", ptt: inner[type].ptt || false });
            await sock.sendMessage(remote, { text: `👁️ *ViewOnce Audio* @${sender.split("@")[0]}`, mentions: [sender] });
          }
        }
      } catch (e) { console.log("ViewOnce:", e.message); }

      await handleMessage(sock, msg);
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    for (let u of updates) {
      try {
        if (!global.botSettings.antidelete) continue;
        if (u.update?.message === null || u.update?.status === 6) {
          const stored = messageStore.get(u.key.id);
          if (!stored) continue;
          const remote = u.key.remoteJid;
          const sender = stored.key.participant || stored.key.remoteJid;
          const text = stored.message?.conversation || stored.message?.extendedTextMessage?.text || "";
          await sock.sendMessage(remote, { text: `🗑️ *AntiDelete*\n👤 @${sender.split("@")[0]} deleted:\n${text}`, mentions: [sender] });
        }
      } catch {}
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      if ((lastDisconnect?.error as Boom)?.output?.statusCode!== DisconnectReason.loggedOut) startBot();
    } else if (connection === "open") {
      console.log(`✅ ${config.botName} Connected!`);
      await loadCommands();
    }
  });
}

startBot();