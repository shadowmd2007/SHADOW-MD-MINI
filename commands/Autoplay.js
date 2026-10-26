import fs from 'fs';
const dbPath = './data/autoplay.json';

export const command = {
  name: 'autoplay',
  aliases: ['autsong', 'aplay'],
  category: 'OWNER',
  description: 'Auto send song when anyone writes song name',

  run: async (ctx) => {
    const arg = ctx.args[0]?.toLowerCase();
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ enabled: false })));
    
    let db = JSON.parse(fs.readFileSync(dbPath));

    if (!arg) {
      return await ctx.reply(
`╭───❀ 🌹 ❀───╮
   🌹 𝐀𝐔𝐓𝐎 𝐏𝐋𝐀𝐘 🌹
╰───❀ 🌹 ❀───╯

*Status:* ${db.enabled ? '✅ ON' : '❌ OFF'}

*How it works:*
If ON, anyone writes only song name,
Bot will automatically send that song.

*Use:*
◦ ${ctx.prefix}autoplay on
◦ ${ctx.prefix}autoplay off

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯`
      );
    }

    if (arg === 'on') {
      db.enabled = true;
      fs.writeFileSync(dbPath, JSON.stringify(db));
      return await ctx.reply(
`✅ *AutoPlay ON Successfully*

Now if anyone writes song name like
*Pasoori* or *Tere Sadqee Mein*
Bot will send the song automatically.

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯`
      );
    }
    if (arg === 'off') {
      db.enabled = false;
      fs.writeFileSync(dbPath, JSON.stringify(db));
      return await ctx.reply(
`❌ *AutoPlay OFF*

Now bot will only send song on
${ctx.prefix}play command.

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯`
      );
    }
  }
};