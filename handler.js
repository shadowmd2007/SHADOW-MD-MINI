import { config } from "./config.js";
import { commands } from "./plugins/index.js";

export async function handleMessage(sock, msg) {
  try {
    if (!msg.message) return;
    const remote = msg.key.remoteJid;
    const isGroup = remote.endsWith("@g.us");

    const messageType = Object.keys(msg.message)[0];
    const messageContent = messageType === "conversation"? msg.message.conversation :
                          messageType === "extendedTextMessage"? msg.message.extendedTextMessage.text : "";

    if (!messageContent) return;

    const prefix = config.prefix || ".";
    if (!messageContent.startsWith(prefix)) return;

    const parts = messageContent.slice(prefix.length).trim().split(/ +/);
    const name = parts.shift().toLowerCase();
    const args = parts;

    if (name === "ping") {
      const start = Date.now();
      await sock.sendMessage(remote, { text: "*Pinging...* 🏓" }, { quoted: msg });
      const speed = Date.now() - start;
      return await sock.sendMessage(remote, { text: `*┌───⭓ PING ⭓───*\n*│* ⚡ *Speed:* ${speed} ms\n*│* 🚀 *Bot:* ${config.botName} v${config.version}\n*└───────────⭓*` }, { quoted: msg });
    }

    if (name === "alive") {
      return await sock.sendMessage(remote, { text: `🟢 *${config.botName} ONLINE*\n👑 Owner: ${config.ownerName}\n⚙️ Version: ${config.version}\n📦 Commands: ${commands.size}` }, { quoted: msg });
    }

    if (name === "menu") {
      const order = ["MAIN", "GROUP", "OWNER", "FUN", "MATH", "TOOLS", "UTILITY", "DOWNLOAD", "AI", "SEARCH", "STICKER", "OTHER"];
      const grouped = new Map(order.map(x => [x, []]));
      for (const c of commands.values()) {
        const cat = (c.category || "OTHER").toUpperCase();
        if (!grouped.has(cat)) grouped.set(cat, []);
        grouped.get(cat).push(c);
      }
      let out = `*┌───⭓ ${config.botName} ⭓───*\n*│* 👑 *OWNER:* ${config.ownerName}\n*│* 🔑 *PREFIX:* ${prefix}\n*│* 🧩 *COMMANDS:* ${commands.size}\n*└───────────────────⭓*\n\n`;
      for (const [cat, arr] of grouped) {
        if (!arr.length) continue;
        arr.sort((a, b) => a.name.localeCompare(b.name));
        out += `*┌───⭓ ${cat.toLowerCase()} ⭓───*\n`;
        for (const c of arr) {
          out += `*│* ⬡.${c.name}\n`;
        }
        out += `*└───────────────────⭓*\n\n`;
      }
      out += `> *Powered by SHADOW MD*`;
      try {
        return await sock.sendMessage(remote, { image: { url: config.imageUrl }, caption: out.trim() }, { quoted: msg });
      } catch {
        return await sock.sendMessage(remote, { text: out.trim() }, { quoted: msg });
      }
    }

    if (name === "owner") {
      return await sock.sendMessage(remote, { text: `👑 *Owner:* ${config.ownerName}\n📞 *Number:* ${config.ownerNumber}` }, { quoted: msg });
    }

    if (name === "rana") {
      return await sock.sendMessage(remote, { text: `❤️ RANA FURQAN RAJPUT` }, { quoted: msg });
    }

    const command = commands.get(name) || [...commands.values()].find(c => c.aliases && c.aliases.includes(name));
    if (!command) return;

    await command.run({ sock, remote, msg, args, commands, config, prefix, isGroup });

  } catch (e) {
    console.error("Handler Error:", e);
  }
} 