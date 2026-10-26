import config from '../config.js';

export const command = {
  name: 'menu',
  aliases: ['help', 'list', 'commands', 'allmenu'],
  category: 'MAIN',
  description: 'Show all bot commands (Auto)',
  run: async (ctx) => {
    // --- AUTO COMMAND LOADER ---
    const allCommands = ctx.commandList || [];
    const validCommands = allCommands.filter(c => c && c.name && !c.hidden);
    
    // Category wise grouping
    const groups = new Map();
    for (const cmd of validCommands) {
      const cat = String(cmd.category || cmd.cat || 'OTHER').toUpperCase();
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(cmd.name);
    }

    let body = `╭───『 ${config.botName} 』───
│ Owner: ${config.ownerName}
│ Prefix: ${ctx.prefix || config.prefix}
│ Commands: ${validCommands.length}
│ Mode: ${config.mode}
│ Version: ${config.version}
╰────────────────────\n\n`;

    // Har category ko auto dikhana
    const sortedCats = [...groups.keys()].sort();
    for (const cat of sortedCats) {
      const cmds = [...new Set(groups.get(cat))].sort(); // duplicate hatana
      body += `*${cat}*\n`;
      body += cmds.map(n => `  ◦ ${ctx.prefix || '.'}${n}`).join('\n') + '\n\n';
    }

    body += `
╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯
`;

    // --- JAWAD STYLE VIEW CHANNEL BUTTON ---
    const contextInfo = {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: config.channelJid,
        newsletterName: config.channelName,
        serverMessageId: 1
      }
    };

    try {
      await ctx.sock.sendMessage(ctx.jid, {
        image: { url: config.menuImage },
        caption: body.trim(),
        contextInfo: contextInfo
      }, { quoted: ctx.m });
    } catch (e) {
      // Agar image fail ho to text me bhej de
      await ctx.sock.sendMessage(ctx.jid, {
        text: body.trim(),
        contextInfo: contextInfo
      }, { quoted: ctx.m });
    }
  }
};