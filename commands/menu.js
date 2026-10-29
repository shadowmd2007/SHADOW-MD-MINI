
export const command = {
  name: 'menu',
  aliases: ['help', 'commands', 'list'],
  category: 'MAIN',
  description: 'Display all bot commands',

  run: async (ctx) => {
    const prefix = ctx.prefix || '.';
    const config = ctx.config || {};

    const botName = 'RANA FURQAN MD';
    const ownerName = config.ownerName || 'RANA FURQAN';
    const channelUrl =
      config.channelUrl ||
      process.env.CHANNEL_URL ||
      'https://whatsapp.com/';

    const commandList = Array.isArray(ctx.commandList)
      ? ctx.commandList
      : [];

    const groups = {
      '🤖 AI ASSISTANT': ['gpt', 'ai', 'chatgpt'],
      '🎵 MUSIC & VIDEO': ['play', 'video', 'song'],
      '📺 DRAMA & SEARCH': ['drama', 'google', 'search'],
      '💖 FUN & ENTERTAINMENT': ['joke', 'love', 'kiss'],
      '👁️ VIEW-ONCE MEDIA': ['vv', 'vv2', 'vv3'],
      '🛡️ SECURITY & PROTECTION': [
        'antidelete',
        'antilink',
        'antistatus',
        'anticall'
      ],
      '⚙️ AUTO FEATURES': [
        'autoreact',
        'autostatus',
        'statusview',
        'statuslike',
        'alwaysonline',
        'online'
      ],
      '📌 GENERAL COMMANDS': [
        'menu',
        'help',
        'ping',
        'alive',
        'owner'
      ]
    };

    const commands = new Map();

    for (const item of commandList) {
      if (!item || !item.name) continue;

      const name = String(item.name).toLowerCase();
      commands.set(name, item);

      for (const alias of item.aliases || []) {
        const aliasName = String(alias).toLowerCase();

        if (!commands.has(aliasName)) {
          commands.set(aliasName, item);
        }
      }
    }

    const output = [];
    const printed = new Set();

    for (const [heading, names] of Object.entries(groups)) {
      const entries = [];

      for (const name of names) {
        const item = commands.get(name);

        if (!item) continue;

        const actualName = String(item.name).toLowerCase();

        if (printed.has(actualName)) continue;

        printed.add(actualName);
        entries.push(`${prefix}${actualName}`);
      }

      if (!entries.length) continue;

      output.push(`\n╭━━〔 ${heading} 〕━━╮`);

      for (const entry of entries) {
        output.push(`┃ ✦ ${entry}`);
      }

      output.push('╰━━━━━━━━━━━━━━╯');
    }

    const extra = [];

    for (const item of commandList) {
      if (!item || !item.name) continue;

      const name = String(item.name).toLowerCase();

      if (printed.has(name)) continue;

      printed.add(name);
      extra.push(`${prefix}${name}`);
    }

    if (extra.length) {
      output.push('\n╭━━〔 ✨ MORE COMMANDS 〕━━╮');

      for (const name of extra.sort()) {
        output.push(`┃ ✦ ${name}`);
      }

      output.push('╰━━━━━━━━━━━━━━━━╯');
    }

    const menuText = `
╭━━━━━━━━━━━━━━━━━━╮
┃ 🌹 RANA FURQAN MD 🌹
┃ PREMIUM COMMAND CENTER
╰━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━
┃ 👑 OWNER: ${ownerName}
┃ ⚡ PREFIX: ${prefix}
┃ 📚 COMMANDS: ${commandList.length}
┗━━━━━━━━━━━━━━━━━━

${output.join('\n')}

╭━━━━━━━━━━━━━━━━━━╮
┃ 🌹 POWERED BY
┃    Meri JAAN 🌹
╰━━━━━━━━━━━━━━━━━━╯

📢 CHANNEL:
${channelUrl}
`;

    return ctx.sock.sendMessage(
      ctx.jid,
      { text: menuText },
      { quoted: ctx.m }
    );
  }
};

export default { command };
