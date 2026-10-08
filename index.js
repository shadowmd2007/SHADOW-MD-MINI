import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, Browsers } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import pino from "pino";
import { config } from "./config.js";
import { loadCommands } from "./commands.js";
import { handleMessage } from "./handler.js";

// GLOBAL SETTINGS - ON/OFF CONTROL
global.botSettings = {
  antidelete: true,
  antiviewonce: true,
  antistatus: false,
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
  pmblock: false
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

  // MESSAGE STORE + VIEWONCE ENGINE
  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (let msg of messages) {
      if (!msg.message) continue;

      // STORE FOR ANTIDELETE
      if (msg.key.id) {
        messageStore.set(msg.key.id, {...msg });
        if (messageStore.size > 1000) {
          const firstKey = messageStore.keys().next().value;
          messageStore.delete(firstKey);
        }
      }

      // ANTIVIEWONCE - IMAGE/VIDEO/AUDIO FULL
      try {
        if (global.botSettings.antiviewonce && msg.message?.viewOnceMessage) {
          const inner = msg.message.viewOnceMessage.message;
          const type = Object.keys(inner)[0];
          const cap = inner[type]?.caption || "";
          const sender = msg.key.participant || msg.key.remoteJid;
          const remote = msg.key.remoteJid;

          let buffer = await downloadMediaMessage(msg, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });

          if (type === "imageMessage") {
            await sock.sendMessage(remote, { image: buffer, caption: `👁️ *ViewOnce Recovered*\n👤 From: @${sender.split("@")[0]}\n${cap}`, mentions: [sender] }, { quoted: msg });
          } else if (type === "videoMessage") {
            await sock.sendMessage(remote, { video: buffer, caption: `👁️ *ViewOnce Video Recovered*\n👤 From: @${sender.split("@")[0]}\n${cap}`, mentions: [sender] }, { quoted: msg });
          } else if (type === "audioMessage") {
            await sock.sendMessage(remote, { audio: buffer, mimetype: "audio/mp4", ptt: inner[type].ptt || false }, { quoted: msg });
            await sock.sendMessage(remote, { text: `👁️ *ViewOnce Audio Recovered*\n👤 From: @${sender.split("@")[0]}`, mentions: [sender] });
          }
        }

        // ALSO CHECK viewOnceMessageV2
        if (global.botSettings.antiviewonce && msg.message?.viewOnceMessageV2) {
          const inner = msg.message.viewOnceMessageV2.message;
          const type = Object.keys(inner)[0];
          const cap = inner[type]?.caption || "";
          const sender = msg.key.participant || msg.key.remoteJid;
          const remote = msg.key.remoteJid;
          let buffer = await downloadMediaMessage(msg, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
          if (type === "imageMessage") {
            await sock.sendMessage(remote, { image: buffer, caption: `👁️ *ViewOnce Recovered*\n👤 From: @${sender.split("@")[0]}\n${cap}`, mentions: [sender] }, { quoted: msg });
          } else if (type === "videoMessage") {
            await sock.sendMessage(remote, { video: buffer, caption: `👁️ *ViewOnce Video Recovered*\n👤 From: @${sender.split("@")[0]}`, mentions: [sender] }, { quoted: msg });
          } else if (type === "audioMessage") {
            await sock.sendMessage(remote, { audio: buffer, mimetype: "audio/mp4", ptt: inner[type].ptt || false }, { quoted: msg });
          }
        }
      } catch (e) { console.log("ViewOnce Error:", e.message); }

      // NORMAL COMMANDS
      await handleMessage(sock, msg);
    }
  });

  // ANTIDELETE ENGINE - FULL WORKING
  sock.ev.on("messages.update", async (updates) => {
    for (let update of updates) {
      try {
        if (!global.botSettings.antidelete) continue;
        if (update.update?.message === null || update.update?.status === 6 || update.update?.messageStubType === 68) {
          const id = update.key.id;
          const stored = messageStore.get(id);
          if (!stored) continue;
          const remote = update.key.remoteJid;
          const sender = stored.key.participant || stored.key.remoteJid;
          const type = Object.keys(stored.message || {})[0];
          let text = stored.message?.conversation || stored.message?.extendedTextMessage?.text || stored.message?.imageMessage?.caption || stored.message?.videoMessage?.caption || "";

          if (type === "imageMessage" || type === "videoMessage" || type === "audioMessage" || type === "stickerMessage" || type === "documentMessage") {
            try {
              let buffer = await downloadMediaMessage(stored, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
              if (type === "imageMessage") await sock.sendMessage(remote, { image: buffer, caption: `🗑️ *AntiDelete*\n👤 @${sender.split("@")[0]} deleted image\n📝 ${text}`, mentions: [sender] });
              else if (type === "videoMessage") await sock.sendMessage(remote, { video: buffer, caption: `🗑️ *AntiDelete*\n👤 @${sender.split("@")[0]} deleted video\n📝 ${text}`, mentions: [sender] });
              else if (type === "audioMessage") await sock.sendMessage(remote, { audio: buffer, mimetype: "audio/mp4", ptt: false });
              else if (type === "stickerMessage") await sock.sendMessage(remote, { sticker: buffer });
              else if (type === "documentMessage") await sock.sendMessage(remote, { document: buffer, mimetype: stored.message.documentMessage.mimetype, fileName: stored.message.documentMessage.fileName });
            } catch {}
          } else {
            await sock.sendMessage(remote, { text: `🗑️ *AntiDelete Detected*\n👤 From: @${sender.split("@")[0]}\n💬 Deleted: ${text}`, mentions: [sender] });
          }
        }
      } catch (e) { console.log("Antidelete Error:", e.message); }
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode!== DisconnectReason.loggedOut;
      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log(`✅ ${config.botName} Connected!`);
      await loadCommands();
      console.log(`📦 Commands loaded! AntiDelete: ${global.botSettings.antidelete? "ON" : "OFF"} AntiView: ${global.botSettings.antiviewonce? "ON" : "OFF"}`);
    }
  });
}

startBot();