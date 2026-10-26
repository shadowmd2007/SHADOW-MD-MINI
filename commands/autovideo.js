import fs from 'fs';
const dbPath = './data/autovideo.json';
export const command = {
  name: 'autovideo',
  category: 'OWNER',
  description: 'Auto send video when anyone writes video name',
  run: async (ctx) => {
    const arg = ctx.args[0]?.toLowerCase();
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ enabled: false }));
    let db = JSON.parse(fs.readFileSync(dbPath));
    if (!arg) {
      return await ctx.reply(`╭───❀ 🌹 ❀───╮\n   🌹 𝐀𝐔𝐓𝐎 𝐕𝐈𝐃𝐄𝐎 🌹\n╰───❀ 🌹 ❀───╯\n\n*Status:* ${db.enabled ? '✅ ON' : '❌ OFF'}\n\n*Use:*\n◦ ${ctx.prefix}autovideo on\n◦ ${ctx.prefix}autovideo off\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`);
    }
    if (arg === 'on') { db.enabled = true; fs.writeFileSync(dbPath, JSON.stringify(db)); return await ctx.reply(`✅ *AutoVideo ON*\n\nNow if anyone writes video name, bot will send video automatically.\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`); }
    if (arg === 'off') { db.enabled = false; fs.writeFileSync(dbPath, JSON.stringify(db)); return await ctx.reply(`❌ *AutoVideo OFF*\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`); }
  }
};