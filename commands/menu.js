import fs from 'fs';
import path from 'path';

export const command = {
  name: "menu",
  aliases: ["help"],
  category: "GENERAL",
  description: "Full Menu - Auto Shows All Commands",
  run: async ({ sock, jid, m, prefix }) => {
    
    let MENU_IMG = process.env.BOT_DP || 'https://files.catbox.moe/y04tbj.jpg';
    let botName = 'RANA FURQAN MD';
    try {
      if (fs.existsSync('./config.js')) {
        const cfg = await import(`file://${process.cwd()}/config.js?t=${Date.now()}`);
        const c = cfg.default || cfg;
        MENU_IMG = c.BOT_IMAGE || c.MENU_IMAGE || c.ALIVE_IMG || c.IMAGE || c.BOT_DP || MENU_IMG;
        botName = c.BOT_NAME || botName;
      }
    } catch {}

    let version = '5.0.0';
    let mode = 'PUBLIC';
    try {
      if (fs.existsSync('./package.json')) {
        const pkg = JSON.parse(fs.readFileSync('./package.json'));
        version = pkg.version || '5.0.0';
      }
      mode = process.env.MODE || mode;
    } catch {}

    // AUTO LOAD ALL COMMANDS FOR .menu ONLY
    let categoryText = '';
    try {
      const cmdPath = path.join(process.cwd(), 'commands');
      const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
      const categories = {};
      
      for (const file of files) {
        const cmdName = file.replace('.js','').toLowerCase();
        if(cmdName === 'menu') continue;
        let cat = 'OTHER';
        if(['play','video','song','fb','tiktok','insta','ytmp3','ytmp4'].some(x=>cmdName.includes(x))) cat = 'DOWNLOADER';
        else if(['gpt','ai','gemini','bot','chat'].some(x=>cmdName.includes(x))) cat = 'AI';
        else if(['group','promote','demote','kick','add','tag'].some(x=>cmdName.includes(x))) cat = 'GROUP';
        else if(['alive','ping','owner','info','menu'].some(x=>cmdName.includes(x))) cat = 'GENERAL';
        else if(['sticker','stiker','s'].some(x=>cmdName.includes(x))) cat = 'CONVERTER';
        
        if(!categories[cat]) categories[cat] = [];
        categories[cat].push(cmdName);
      }

      for (const [cat, cmds] of Object.entries(categories)) {
        categoryText += `\n╭── ${cat} ──\n`;
        for (const c of cmds) {
          categoryText += `│ ◦ ${prefix}${c}\n`;
        }
        categoryText += `╰────────────\n`;
      }
    } catch (e) {
      categoryText = `│ ◦ ${prefix}ping\n│ ◦ ${prefix}alive\n│ ◦ ${prefix}owner\n`;
    }

    const totalCommands = global.commands ? global.commands.size : 109;

    const finalMenu = `┏━━━━━━━━━━━━━━┓
┃ 🌹 RANA FURQAN MD 🌹 ┃
┗━━━━━━━━━━━━━━┛

   ❄️🌹❄️
   💖 RANA KI JAN 💖
   ❄️🌹❄️

┏━━━━ BOT INFO ━━━━┓
┃ VERSION : ${version}
┃ MODE : ${mode}
┃ PREFIX : ${prefix}
┃ COMMANDS : ${totalCommands}
┃ OWNER : RANA KI JAAN
┗━━━━━━━━━━━━━━┛

┏━━━━ ALL COMMANDS ━━━━┓
${categoryText}
┗━━━━━━━━━━━━━━┛

┏━━━━ HOW TO USE ━━━━┓
┃ For Song: ${prefix}play Pasoori
┃ For Video: ${prefix}video Pasoori
┗━━━━━━━━━━━━━━┛

🌹 POWERED BY MERI JAAN 🌹
`;

    try {
      await sock.sendMessage(jid, { image: { url: MENU_IMG }, caption: finalMenu }, { quoted: m });
    } catch {
      await sock.sendMessage(jid, { text: finalMenu }, { quoted: m });
    }
  }
};