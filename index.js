import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, Browsers } from "@whiskeysockets/baileys";
import pino from "pino";
import { config } from "./config.js";
import { loadCommands } from "./commands.js";
import { handleMessage } from "./handler.js";

global.botSettings = { antidelete: true, antiviewonce: true, antilink: false, welcome: false, autoreact: false, autotyping: false, autostatusview: false, antispam: false };

const messageStore = new Map();
const logger = pino({ level: "silent" });

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.sessionPath);
  const sock = makeWASocket({ auth: state, logger, browser: Browsers.macOS("Chrome"), printQRInTerminal: false });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (let msg of messages) {
      if (!msg.message) continue;
      if (msg.key.id) { messageStore.set(msg.key.id, {...msg }); if(messageStore.size>200) messageStore.delete(messageStore.keys().next().value); }

      try {
        if (global.botSettings.antiviewonce && (msg.message.viewOnceMessage || msg.message.viewOnceMessageV2)) {
          const inner = msg.message.viewOnceMessage?.message || msg.message.viewOnceMessageV2?.message;
          const type = Object.keys(inner)[0];
          const sender = msg.key.participant || msg.key.remoteJid;
          const remote = msg.key.remoteJid;
          let buffer = await downloadMediaMessage(msg, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
          if (type === "imageMessage") await sock.sendMessage(remote, { image: buffer, caption: "👁️ ViewOnce @"+sender.split("@")[0], mentions: [sender] });
          else if (type === "videoMessage") await sock.sendMessage(remote, { video: buffer, caption: "👁️ ViewOnce Video @"+sender.split("@")[0], mentions: [sender] });
          else if (type === "audioMessage") await sock.sendMessage(remote, { audio: buffer, mimetype: "audio/mp4", ptt: true });
        }
      } catch(e){}

      await handleMessage(sock, msg);
    }
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      let code = lastDisconnect?.error?.output?.statusCode;
      if (code!== DisconnectReason.loggedOut) startBot();
    } else if (connection === "open") {
      console.log("✅ Connected 37 CMDS");
      await loadCommands();
    }
  });
}
startBot();