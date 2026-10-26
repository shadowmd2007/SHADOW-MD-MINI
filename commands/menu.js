import fs from 'fs';
import path from 'path';

export const command = {
  name: 'menu',
  aliases: ['help', 'list', 'allmenu', 'rana'],
  category: 'GENERAL',
  description: 'Auto commands menu with DP',

  run: async (ctx) => {
    const { sock, jid, m, prefix } = ctx;

    try {
      // --- GET BOT DP ---
      let botPpUrl;
      try {
        botPpUrl = await sock.profilePictureUrl(sock.user.id, 'image');
      } catch {
        botPpUrl = 'https://files.catbox.moe/y04tbj.jpg'; // Default DP
      }

      // --- GET VERSION, MODE, PREFIX ---
      let version = '2.0.0';
      try {
        if (fs.existsSync('./package.json')) {
          const pkg = JSON.parse(fs.readFileSync('./package.json'));
          version = pkg.version || '2.0.0';
        }
      } catch {}

      let mode = process.env.MODE || process.env.BOT_MODE || 'PUBLIC';
      let botName = process.env.BOT_NAME || 'SHADOW-MD';

      // --- UPTIME ---
      const uptimeSec = process.uptime();
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec % 86400) / 3600);
      const mins = Math.floor((uptimeSec % 3600) / 60);
      const uptime = `${days}D ${hours}H ${mins}M`;

      // --- AUTO LOAD ALL COMMANDS FROM FOLDER ---
      const commandsPath = './commands';
      let files = [];
      try {
        files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
      } catch { files = []; }

      const totalCommands = files.length;

      // Categorize
      let categories = {};
      for (const file of files) {
        try {
          const filePath = path.join(process.cwd(), commandsPath, file);
          // We can't import dynamically easily, so we just list by name
          const cmdName = file.replace('.js', '');
          let cat = 'OTHER';
          if (['play','video','song','drama','ytmp3','ytmp4','mp3'].includes(cmdName)) cat = 'DOWNLOADER';
          if (['autoplay','autovideo','autoreact','antidelete','autodel'].includes(cmdName)) cat = 'AUTO SYSTEM';
          if (['menu','help','ping','alive','owner','bot'].includes(cmdName)) cat = 'GENERAL';
          if (['group','kick','add','promote'].includes(cmdName)) cat = 'GROUP';

          if (!categories[cat]) categories[cat] = [];
          categories[cat].push(cmdName);
        } catch {}
      }

      let categoryText = '';
      for (const [cat, cmds] of Object.entries(categories)) {
        categoryText += `\n╭───❀ 🌹 ${cat} ❀───╮\n`;
        for (const c of cmds) {
          categoryText += `│ ◦ ${prefix}${c}\n`;
        }
        categoryText += `╰───❀ 🌹 ❀───╯\n`;
      }

      // --- FINAL MENU WITH BIG FONTS ---
      const finalMenu = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐒𝐇𝐀𝐃𝐎𝐖 𝐌𝐃 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━╯

╭───❀ 🌹 ❀───╮
   💖 𝐑𝐀𝐍𝐀 𝐊𝐈 𝐉𝐀𝐍 💖
╰───❀ 🌹 ❀───╯

╭━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐁𝐎𝐓 𝐈𝐍𝐅𝐎 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

┏━━━━━━━━━━━━━━━━━━┓
┃  🔰 𝐕𝐄𝐑𝐒𝐈𝐎𝐍 : ${version}
┃  🔰 𝐌𝐎𝐃𝐄 : ${mode.toUpperCase()}
┃  🔰 𝐏𝐑𝐄𝐅𝐈𝐗 : ${prefix}
┃  🔰 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 : ${totalCommands}
┃  🔰 𝐔𝐏𝐓𝐈𝐌𝐄 : ${uptime}
┃  🔰 𝐎𝐖𝐍𝐄𝐑 : 𝐑𝐀𝐍𝐀 𝐊𝐈 𝐉𝐀𝐀𝐍
┗━━━━━━━━━━━━━━━━━━┛

╭━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐀𝐋𝐋 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯
${categoryText}
╭━━━━━━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐇𝐎𝐖 𝐓𝐎 𝐔𝐒𝐄 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━━━━━━╯

◦ For Song: ${prefix}play Pasoori
◦ For Video: ${prefix}video Pasoori

◦ If ${prefix}autoplay on -> Just write song name
◦ If ${prefix}autovideo on -> Just write video name

◦ ${prefix}antidelete on -> Deleted msgs only on your personal with number

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
   💖 𝐑𝐀𝐍𝐀 𝐊𝐈 𝐉𝐀𝐀𝐍 💖
╰───❀ 🌹 ❀───╯
`;

      await sock.sendMessage(jid, { 
        image: { url: botPpUrl }, 
        caption: finalMenu 
      }, { quoted: m });

    } catch (e) {
      await ctx.reply(`❌ Menu Error: ${e.message}`);
    }
  }
};