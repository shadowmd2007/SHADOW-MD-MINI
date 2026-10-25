
import { config } from '../config.js';

export const command = {
  name: 'menu',
  aliases: ['help', 'list', 'commands'],
  category: 'MAIN',
  description: 'Show all commands',

  run: async (ctx) => {
    const entries = (ctx.commandList || [])
      .filter(c => !c.hidden)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    const groups = new Map();

    for (const c of entries) {
      const cat = String(c.cat || c.category || 'GENERAL').toUpperCase();

      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat).push(c);
    }

    let text = `*╭───『 ${config.botName || 'SHADOW MD'} 』───*
*│* OWNER: ${config.ownerName || 'RANA FURQAN'}
*│* PREFIX: ${ctx.prefix || config.prefix || '.'}
*│* COMMANDS: ${entries.length}
*╰───────────────*

`;

    for (const [cat, cmds] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
      text += `*${cat}*
${cmds.map(c => `${ctx.prefix || '.'}${c.name}`).join('\n')}

`;
    }

    text += '> Powered by SHADOW MD MINI';

    return ctx.reply(text.trim());
  }
};
