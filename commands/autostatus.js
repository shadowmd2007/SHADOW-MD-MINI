import fs from 'fs';
import path from 'path';

const dbPath = './data/autoreact.json';

export const command = {
  name: 'autoreact',
  aliases: ['react', 'autoreaction'],
  category: 'OWNER',
  description: 'Auto react on/off',

  run: async (ctx) => {
    const args = ctx.args[0]?.toLowerCase();
    
    // data folder banao agar nahi hai
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ enabled: false }));

    let db = JSON.parse(fs.readFileSync(dbPath));

    if (!args) {
      return await ctx.reply(
`╭───❀ 🌹 ❀───╮
   🌹 𝐀𝐔𝐓𝐎 𝐑𝐄𝐀𝐂𝐓 🌹
╰───❀ 🌹 ❀───╯

*Status:* ${db.enabled ? '✅ ON' : '❌ OFF'}

*Use:*
  ◦ ${ctx.prefix}autoreact on
  ◦ ${ctx.prefix}autoreact off

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯
`
      );
    }

    if (args === 'on') {
      db.enabled = true;
      fs.writeFileSync(dbPath, JSON.stringify(db));
      return await ctx.reply('✅ *AutoReact ON ho gaya Meri JAAN* 🌹💖\nAb har message pe bot react karega.');
    }

    if (args === 'off') {
      db.enabled = false;
      fs.writeFileSync(dbPath, JSON.stringify(db));
      return await ctx.reply('❌ *AutoReact OFF ho gaya Meri JAAN* 🌹\nAb bot react nahi karega.');
    }

    return await ctx.reply(`Galat command Meri JAAN 🌹\n*Use:* ${ctx.prefix}autoreact on / off`);
  }
};