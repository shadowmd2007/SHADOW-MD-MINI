import fs from 'fs';
const dbPath = './data/antidelete.json';

export const command = {
  name: 'antidelete',
  aliases: ['antidel', 'ad'],
  category: 'AUTO SYSTEM',
  description: 'Deleted msg only personal',

  run: async (ctx) => {
    const arg = ctx.args[0]?.toLowerCase();
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ enabled: false, ownerJid: null }));

    let db = JSON.parse(fs.readFileSync(dbPath));

    if (!arg) {
      return await ctx.reply(`╭───❀ 🌹 ❀───╮
   🌹 𝐀𝐍𝐓𝐈 𝐃𝐄𝐋𝐄𝐓𝐄 🌹
╰───❀ 🌹 ❀───╯

Status: ${db.enabled ? '✅ ON' : '❌ OFF'}
Owner: ${db.ownerJid ? db.ownerJid.split('@')[0] : 'Not Set'}

Use:
${ctx.prefix}antidelete on
${ctx.prefix}antidelete off

Jab ON hoga to koi bhi message delete karega
Uska Number, Naam, pura Message sirf tumhare Personal pe ayega

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
   💖 𝐑𝐀𝐍𝐀 𝐊𝐈 𝐉𝐀𝐀𝐍 💖
╰───❀ 🌹 ❀───╯`);
    }

    if (arg === 'on') {
      let ownerJid = ctx.jid.endsWith('@g.us') ? ctx.m.key.participant : ctx.jid;
      db.enabled = true;
      db.ownerJid = ownerJid;
      fs.writeFileSync(dbPath, JSON.stringify(db));
      return await ctx.reply(`✅ *AntiDelete ON!*

Ab se deleted message sirf is Personal pe ayega:
${ownerJid.split('@')[0]}

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯`);
    }

    if (arg === 'off') {
      db.enabled = false;
      fs.writeFileSync(dbPath, JSON.stringify(db));
      return await ctx.reply(`❌ AntiDelete OFF`);
    }
  }
};