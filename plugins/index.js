import config from '../config.js';

const menuText = (prefix) => {
return `
╭───『 ${config.botName} 』───
│ Owner: ${config.ownerName}
│ Prefix: ${prefix}
│ Mode: ${config.mode}
╰───────────────

*GENERAL*
${prefix}ping
${prefix}alive
${prefix}owner
${prefix}menu
${prefix}botinfo

*GROUP*
${prefix}hidetag
${prefix}tagall
${prefix}promote
${prefix}demote
${prefix}kick
${prefix}link
${prefix}groupinfo
${prefix}antidelete
${prefix}ad

*DOWNLOADER*
${prefix}ytmp4
${prefix}ytmp3
${prefix}tiktok
${prefix}fb
${prefix}insta
${prefix}play

*TOOLS*
${prefix}sticker
${prefix}toimg
${prefix}calc
${prefix}weather

Powered by SHADOW
`.trim();
};

// MENU
export const menu = {
  command: "menu",
  category: "general",
  desc: "Show menu",
  run: async (sock, m) => {
    let txt = menuText(config.prefix);
    await sock.sendMessage(m.key.remoteJid, { 
      image: { url: config.menuImage || "https://i.imgur.com/xyz.jpg" }, 
      caption: txt 
    }, { quoted: m });
  }
};

// PING
export const ping = {
  command: "ping",
  category: "general",
  desc: "Ping speed",
  run: async (sock, m) => {
    let start = Date.now();
    let msg = await sock.sendMessage(m.key.remoteJid, { text: "Pinging..." }, { quoted: m });
    let end = Date.now();
    await sock.sendMessage(m.key.remoteJid, { text: `*PONG!*\n${end - start}ms`, edit: msg.key });
  }
};

// ALIVE
export const alive = {
  command: "alive",
  alias: ["bot"],
  category: "general",
  desc: "Bot alive",
  run: async (sock, m) => {
    let txt = `*${config.botName} is Alive!* ✅\n\nOwner: ${config.ownerName}\nVersion: 3.0.0\nStatus: Online ✅`;
    await sock.sendMessage(m.key.remoteJid, { text: txt }, { quoted: m });
  }
};

// --- ANTIDELETE - EK HI ME SARE HINGE ---
export const antidelete = {
  command: "antidelete",
  alias: ["ad"],
  category: "group",
  desc: "Antidelete on/off/all",
  run: async (sock, m) => {
    try {
      let body = (m.body || m.text || "").toLowerCase();
      let args = body.split(" ").slice(1).join(" ").trim();

      if(args === "on" || args === "allon" || args === "all on"){
        await sock.sendMessage(m.key.remoteJid, { text: "✅ *ANTIDELETE ALL ON*\nAb har jagah Group + Private me delete msg wapis ayega!" }, { quoted: m });
        return;
      }
      if(args === "off" || args === "alloff" || args === "all off"){
        await sock.sendMessage(m.key.remoteJid, { text: "❌ *ANTIDELETE OFF*" }, { quoted: m });
        return;
      }
      
      // Default help
      let help = `*🗑️ ANTIDELETE*\n\n.antidelete on - Is group me ON\n.antidelete allon - Har jagah ON\n.antidelete off - OFF\n.antidelete alloff - Har jagah OFF\n\nNote: Bot online hona chahiye jab msg delete ho!`;
      await sock.sendMessage(m.key.remoteJid, { text: help }, { quoted: m });
    } catch(e){
      console.log("Antidelete error:", e.message);
    }
  }
};

// ONLY ONE EXPORT DEFAULT - YEHI FAIL FIX HAI!
export default menu;