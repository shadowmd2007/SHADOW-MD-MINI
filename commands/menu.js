import { config } from "../config.js";

export const command = {
  name: "menu",
  aliases: ["allmenu", "help", "list"],
  category: "MAIN",
  description: "Show all loaded commands",
  async run({ sock, remote, msg, commands, prefix }) {
    const groups = new Map();
    for (const cmd of commands.values()) {
      const category = String(cmd.category || "OTHER").toUpperCase();
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(cmd);
    }

    const order = ["MAIN", "GROUP", "OWNER", "FUN", "MATH", "TOOLS", "UTILITY", "DOWNLOAD", "AI", "SEARCH", "STICKER", "OTHER"];
    let text = `*┌───⭓ ${config.botName} ⭓───*\\n`;
    text += `*│* 👑 *OWNER:* ${config.ownerName}\\n`;
    text += `*│* 🔑 *PREFIX:* ${prefix || config.prefix}\\n`;
    text += `*│* 🧩 *COMMANDS:* ${commands.size}\\n`;
    text += `*└───────────────────⭓*\\n\\n`;

    const categories = [...new Set([...order, ...groups.keys()])];
    for (const category of categories) {
      const items = groups.get(category);
      if (!items || !items.length) continue;
      items.sort((a, b) => a.name.localeCompare(b.name));
      text += `*┌───⭓ ${category.toLowerCase()} ⭓───*\\n`;
      for (const cmd of items) text += `*│* ${prefix || config.prefix}${cmd.name}\\n`;
      text += `*└───────────────────⭓*\\n\\n`;
    }

    text += "> *Powered by SHADOW MD*";
    try {
      await sock.sendMessage(remote, { image: { url: config.imageUrl }, caption: text.trim() }, { quoted: msg });
    } catch {
      await sock.sendMessage(remote, { text: text.trim() }, { quoted: msg });
    }
  }
};

export default command; 