import { config } from "./config.js";
import { commands } from "./plugins/index.js";
import { getText, jidNumber, isGroupAdmin } from "./lib/command-utils.js";

export async function handleMessage(sock, msg) {
  try {
    if (!msg?.message) return;
    const remote = msg.key?.remoteJid;
    if (!remote) return;
    if (remote === "status@broadcast") return;

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

    // --- INBUILT COMMANDS (Plugin fail ho bhi jaye to chalenge) ---
    if (name === "ping") {
      const start = Date.now();
      await sock.sendMessage(remote, { text: "Pong! 🏓" }, { quoted: msg });
      return await sock.sendMessage(remote, { text: `*Speed:* ${Date.now() - start}ms\n*Bot:* ${config.botName} v${config.version}` }, { quoted: msg });
    }

    if (name === "alive" || name === "bot") {
      return await sock.sendMessage(remote, { 
        text: `🟢 *${config.botName} ONLINE*\n\n*Owner:* ${config.ownerName}\n*Version:* ${config.version}\n*Prefix:* ${prefix}\n*Mode:* ${config.mode}\n*Status:* Active ✅` 
      }, { quoted: msg });
    }

    if (name === "menu" || name === "help") {
      const allCommands = [...commands.keys()].join(", ");
      return await sock.sendMessage(remote, {
        image: { url: config.imageUrl },
        caption: `*${config.botName} MENU v${config.version}*\n\n*Available:*\n${allCommands}\n\n*Main:*\n.ping - speed\n.alive - status\n.menu - this menu\n.owner - owner info\n.rana - owner\n\n*Owner:* ${config.ownerName}`
      }, { quoted: msg });
    }

    if (name === "owner") {
      return await sock.sendMessage(remote, { text: `*Owner:* ${config.ownerName}\n*Number:* ${config.ownerNumber}\n*Bot:* ${config.botName}` }, { quoted: msg });
    }

    if (name === "rana") {
      return await sock.sendMessage(remote, { text: `❤️ *RANA FURQAN RAJPUT* - Owner of ${config.botName} 👑` }, { quoted: msg });
    }

    // --- PLUGIN COMMANDS ---
    const command = commands.get(name);
    if (!command) {
      console.log(`[NOT FOUND] .${name} | Loaded: ${[...commands.keys()].join(", ")}`);
      return;
    }

    const sender = jidNumber(msg.key.participant || remote);
    const isOwner = sender === jidNumber(config.ownerNumber);
    const isGroup = remote.endsWith("@g.us");
    
    let isAdmin = false;
    if (isGroup) {
      try { 
        isAdmin = await isGroupAdmin(sock, remote, msg.key.participant || remote); 
      } catch {}
    }

    // Private mode check
    if (config.mode === "private" && !isOwner) {
      console.log(`[PRIVATE MODE] Blocked ${sender}`);
      return;
    }

    const ctx = { sock, msg, remote, sender, isOwner, isGroup, isAdmin, args, text };

    if (command.owner && !isOwner) {
      return await sock.sendMessage(remote, { text: "❌ This command is for owner only!" }, { quoted: msg });
    }
    if (command.group && !isGroup) {
      return await sock.sendMessage(remote, { text: "❌ Group only command!" }, { quoted: msg });
    }

    await command.run(ctx);

  } catch (err) {
    console.error("[HANDLER ERROR]", err);
    try {
      await sock.sendMessage(msg.key.remoteJid, { text: `❌ Error: ${err.message}` }, { quoted: msg });
    } catch {}
  }
}