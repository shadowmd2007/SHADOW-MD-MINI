import { config } from '../config.js';

export const name = "menu";
export const category = "main";
export const desc = "Show all commands category wise";

export async function execute(sock, msg, args, extra) {
  const jid = msg.key.remoteJid;
  const DP = config.menuImage || config.botImage || "https://i.ibb.co/BHfCmfbw/jawadmd.jpg";
  
  // TUMHARI SARI 89 COMMANDS CATEGORY WISE
  const categories = {
    "🔥 DOWNLOADER": ["play", "song", "video", "ytmp3", "ytmp4", "fb", "tiktok", "insta", "apk", "mediafire"],
    "👑 OWNER & BOT": ["owner", "alive", "ping", "botinfo", "restart", "update", "setprefix", "mode"],
    "👥 GROUP": ["add", "kick", "promote", "demote", "tagall", "hidetag", "group", "link", "revoke", "announce", "admins"],
    "🛡️ SECURITY": ["antidelete", "antidel", "autostatus", "autoview", "antivv", "vv", "vv2"],
    "😂 FUN & LOVE": ["love", "ship", "hug", "kiss", "slap", "8ball", "truth", "dare", "joke", "fact", "quote", "compliment"],
    "🎮 GAMES": ["roll", "coinflip", "choose", "count", "whosmi"],
    "🔧 TOOLS": ["sticker", "toimg", "fancy", "reverse", "base64", "binary", "calc", "flip", "id", "time", "date", "week", "year", "speed", "test"],
    "📥 EXTRA": ["autoplay", "autovideo", "av", "channel", "demo", "del", "bot", "min", "v3", "vv2", "vv"]
  };

  let total = 0;
  for (const list of Object.values(categories)) total += list.length;

  // BEAUTIFUL MENU DESIGN
  let menuText = `*╭━━━〘 ${config.botName} 〙━━━╮*\n`;
  menuText += `*┃*\n`;
  menuText += `*┃* 👑 *Owner:* ${config.ownerName}\n`;
  menuText += `*┃* 🔢 *Prefix:* ${config.prefix}\n`;
  menuText += `*┃* 📦 *Total Cmds:* ${extra?.commands?.size || total}+ \n`;
  menuText += `*┃* 🌹 *Meri JAAN*\n`;
  menuText += `*┃*\n`;
  menuText += `*╰━━━━━━━━━━━━━━━━━━╯*\n\n`;

  for (const [cat, cmds] of Object.entries(categories)) {
    menuText += `*╭─ ${cat} ─*\n`;
    menuText += `*│* ${cmds.map(c => `⦿ .${c}`).join('\n*│* ')}\n`;
    menuText += `*╰────────────────*\n\n`;
  }

  menuText += `*╭───〘 USAGE 〙───╮*\n`;
  menuText += `*│* .play Tere Sadqe\n`;
  menuText += `*│* .video Song Name\n`;
  menuText += `*│* .vv2 (reply to viewonce)\n`;
  menuText += `*│* .antidelete on\n`;
  menuText += `*╰───────────────╯*\n\n`;
  menuText += `> _${config.botName} v${config.version}_\n`;
  menuText += `> _Powered by Meri JAAN 🌹_`;

  try {
    await sock.sendMessage(jid, {
      image: { url: DP },
      caption: menuText
    }, { quoted: msg });
  } catch (e) {
    // Agar image fail ho to text bhej de
    await sock.sendMessage(jid, { text: menuText }, { quoted: msg });
  }
}

export default { name, execute };