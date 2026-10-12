import { config } from "./config.js";
import { commands } from "./plugins/index.js";
import { getText, jidNumber, isGroupAdmin } from "./lib/command-utils.js";

export async function handleMessage(sock, msg) {
  try {
    if (!msg?.message) return;
    const remote = msg.key?.remoteJid;
    if (!remote || remote === "status@broadcast") return;
    const text = getText(msg) || "";
    if (!text) return;
    console.log(`[MSG] ${remote}: ${text}`);
    const prefix = config.prefix || ".";
    if (!text.startsWith(prefix)) return;
    const body = text.slice(prefix.length).trim();
    if (!body) return;
    const parts = body.split(/\s+/);
    const name = parts.shift().toLowerCase();
    const args = parts;

    if (name === "ping") {
      return await sock.sendMessage(remote, { text: `Pong! 🏓 ${config.botName} v${config.version}` }, { quoted: msg });
    }
    if (name === "alive") {
      return await sock.sendMessage(remote, { text: `🟢 ${config.botName} ONLINE\nOwner: ${config.ownerName}` }, { quoted: msg });
    }
    if (name === "menu") {
      return await sock.sendMessage(remote, { text: `*MENU v${config.version}*\n.ping\n.alive\n.menu\n.owner\n.rana` }, { quoted: msg });
    }
    if (name === "owner") {
      return await sock.sendMessage(remote, { text: `Owner: ${config.ownerName}` }, { quoted: msg });
    }
    if (name === "rana") {
      return await sock.sendMessage(remote, { text: `❤️ RANA FURQAN RAJPUT` }, { quoted: msg });
    }

    const command = commands.get(name);
    if (!command) return;

    const sender = jidNumber(msg.key.participant || remote);
    const isOwner = sender === jidNumber(config.ownerNumber);
    const isGroup = remote.endsWith("@g.us");
    let isAdmin = false;
    if (isGroup) {
      try { isAdmin = await isGroupAdmin(sock, remote, msg.key.participant || remote); } catch {}
    }
    if (config.mode === "private" && !isOwner) return;

    const ctx = { sock, msg, remote, sender, isOwner, isGroup, isAdmin, args, text };
    if (command.owner && !isOwner) return await sock.sendMessage(remote, { text: "❌ Owner only" }, { quoted: msg });
    if (command.group && !isGroup) return await sock.sendMessage(remote, { text: "❌ Group only" }, { quoted: msg });
    await command.run(ctx);

  } catch (err) {
    console.error("[HANDLER ERROR]", err);
  }
}