import config from '../config.js';

export const command = {
  name: 'menu',
  aliases: ['help', 'list', 'commands'],
  category: 'MAIN',
  description: 'Show all commands',
  run: async (ctx) => {
    const entries = (ctx.commandList || []).filter(c => !c.hidden)
      .slice().sort((a, b) => a.name.localeCompare(b.name));
    const groups = new Map();
    for (const c of entries) {
      const cat = String(c.cat || c.category || 'GENERAL').toUpperCase();
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(c);
    }

    let body = `╭───『 RANA FURQAN MD 』───
│ Owner: Rana Furqan Rajput
│ Prefix: ${ctx.prefix || config.prefix || '.'}
│ Uptime: ${Math.floor(process.uptime())} seconds
│ Mode: ${config.mode || 'public'}
│ Version: ${config.version || '5.0.0'}
│ Commands: ${entries.length}
╰────────────────────

`;

    for (const [cat, cmds] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      body += `*${cat}*\n${cmds.map(c => `${ctx.prefix || '.'}${c.name}`).join('\n')}\n\n`;
    }

    body += `Channel: ${config.channelLink}\nGroup: ${config.groupLink}\n\nMeri JAAN`;
    try {
      const imageUrl = config.menuImage || config.botImage;
      if (imageUrl) {
        await ctx.sock.sendMessage(ctx.jid, {
          image: { url: imageUrl },
          caption: body.trim()
        }, { quoted: ctx.m });
        return;
      }
    } catch (e) {
      console.error('Menu image failed:', e.message);
    }

    return ctx.reply(body.trim());
  }
};