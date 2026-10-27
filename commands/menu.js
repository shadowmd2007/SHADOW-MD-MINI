import fs from 'fs';

export const command = {
  name: "menu",
  aliases: ["allmenu", "help", "list"],
  category: "GENERAL",
  description: "All commands menu with DP",
  run: async ({ sock, jid, m, prefix }) => {
    
    // Config se image lega, nahi mile to BOT_DP
    let MENU_IMG = process.env.BOT_DP || 'https://files.catbox.moe/y04tbj.jpg';
    let botName = process.env.BOT_NAME || 'RANA FURQAN MD';
    
    try {
      if (fs.existsSync('./config.js')) {
        const cfg = await import('../config.js?t=' + Date.now());
        const c = cfg.default || cfg;
        MENU_IMG = c.BOT_IMAGE || c.MENU_IMAGE || c.ALIVE_IMG || c.IMAGE || MENU_IMG;
      }
    } catch {}

    let version = '5.0.0';
    let mode = process.env.MODE || 'PUBLIC';
    try {
      if (fs.existsSync('./package.json')) {
        const pkg = JSON.parse(fs.readFileSync('./package.json'));
        version = pkg.version || '5.0.0';
      }
    } catch {}

    const totalCommands = global.commands ? global.commands.size : 109;
    const uptimeSec = process.uptime();
    const days = Math.floor(uptimeSec / 86400);
    const hours = Math.floor((uptimeSec % 86400) / 3600);
    const mins = Math.floor((uptimeSec % 3600) / 60);
    const uptime = `${days}D ${hours}H ${mins}M`;

    const menuText = `
🌹 ${botName} 🌹
💖 RANA KI JAN 💖

┌─── BOT INFO ───┐
│ VERSION : ${version}
│ MODE : ${mode.toUpperCase()}
│ PREFIX : ${prefix}
│ COMMANDS : ${totalCommands}
│ UPTIME : ${uptime}
│ OWNER : RANA KI JAAN
└─────────────────┘

Type ${prefix}allmenu for full list
POWERED BY MERI JAAN 🌹
`;

    try {
      await sock.sendMessage(jid, { image: { url: MENU_IMG }, caption: menuText }, { quoted: m });
    } catch (e) {
      await sock.sendMessage(jid, { text: menuText }, { quoted: m });
    }
  }
};