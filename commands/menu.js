import config from '../config.js';

export default {
  name: "menu",
  alias: ["help", "list", "commands"],
  category: "MAIN",
  description: "Show all commands",
  
  async run(sock, remote, extra) {
    try {
      // Commands Map ko handler se lo
      let commandsMap;
      try {
        const handlerMod = await import('../handler.js');
        commandsMap = handlerMod.commands || handlerMod.default?.commands || global.commands;
      } catch {
        commandsMap = global.commands || new Map();
      }

      // Agar commands.js se hai to
      if (!commandsMap || commandsMap.size === 0) {
        try {
          const cmdMod = await import('../commands.js');
          commandsMap = cmdMod.commands || cmdMod.default || new Map();
        } catch {}
      }

      let prefix = config.prefix || ".";
      let groups = new Map();

      // Saare commands ko category wise group karo
      for (const cmd of commandsMap.values()) {
        let cat = (cmd.category || cmd.cat || "OTHER").toUpperCase();
        if (!groups.has(cat)) groups.set(cat, []);
        groups.get(cat).push(cmd);
      }

      let total = commandsMap.size;
      let text = `*╭───『 ${config.botName || "SHADOW MD MINI"} 』───*\n`;
      text += `*│* OWNER: ${config.ownerName || "RANA FURQAN"}\n`;
      text += `*│* PREFIX: ${prefix}\n`;
      text += `*│* COMMANDS: ${total}\n`;
      text += `*│* MODE: ${config.mode || "public"}\n`;
      text += `*╰───────────────*\n\n`;

      // Categories ko sort karke dikhao
      let categories = Array.from(groups.keys()).sort();
      
      for (const category of categories) {
        let items = groups.get(category);
        items.sort((a, b) => (a.name || a.command || "").localeCompare(b.name || b.command || ""));
        
        text += `*${category}*\n`;
        for (const cmd of items) {
          let cmdName = cmd.name || cmd.command || "unknown";
          text += ` ${prefix}${cmdName}\n`;
        }
        text += `\n`;
      }

      text += `> Powered by SHADOW MD`;

      await sock.sendMessage(remote, {
        image: { url: config.menuImage || "https://files.catbox.moe/7zf9q6.jpg" },
        caption: text.trim()
      }, { quoted: extra?.msg || undefined });

    } catch (e) {
      console.log("Menu error:", e.message);
      await sock.sendMessage(remote, { text: `*MENU*\nError: ${e.message}\n\nTotal Commands: 78\nUse .antidelete on` }, { quoted: extra?.msg });
    }
  }
};