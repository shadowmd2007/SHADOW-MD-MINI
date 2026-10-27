import fs from 'fs';

export const command = {
  name: "menu",
  aliases: ["allmenu", "help", "list"],
  run: async ({ sock, jid, m, prefix }) => {
    
    // Config file se picture ka link lega
    let MENU_IMG = process.env.BOT_DP || process.env.MENU_IMG || 'https://files.catbox.moe/y04tbj.jpg';
    
    try {
      // config.js dhoodega
      const possiblePaths = ['./config.js', '../config.js', '../../config.js', './settings/config.js', './src/config.js'];
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          const cfg = await import(`file://${process.cwd()}/${p}?t=${Date.now()}`);
          const c = cfg.default || cfg;
          MENU_IMG = c.BOT_IMAGE || c.MENU_IMAGE || c.ALIVE_IMG || c.IMAGE || c.BOT_DP || c.MENU || MENU_IMG;
          break;
        }
      }
    } catch (e) {
      console.log('Config image not found, using default:', MENU_IMG);
    }

    const totalCommands = global.commands ? global.commands.size : 109;

    const menuText = `
┏━━━━━━━━━━━━━━━━━━━━┓
┃  🌹 RANA FURQAN MD 🌹  ┃
┗━━━━━━━━━━━━━━━━━━━━┛

     ❁ 🌹 ❁
  💖 RANA KI JAN 💖
     ❁ 🌹 ❁

┏━━━━━━━━━━━━━━━━━━━━┓
┃  🌹 BOT INFO 🌹  ┃
┗━━━━━━━━━━━━━━━━━━━━┛

┌─────────────────┐
│ 📚 VERSION : 5.0.0
│ 📚 MODE : PUBLIC
│ 📚 PREFIX : ${prefix}
│ 📚 COMMANDS : ${totalCommands}
│ 📚 OWNER : RANA KI JAAN
└─────────────────┘

🌹 POWERED BY MERI JAAN 🌹

Type ${prefix}allmenu for full list!
`;

    try {
      await sock.sendMessage(jid, { 
        image: { url: MENU_IMG },
        caption: menuText 
      }, { quoted: m });
    } catch (e) {
      // Agar image fail ho to text hi bhej de
      await sock.sendMessage(jid, { text: menuText }, { quoted: m });
    }
  }
}