import config from '../config.js';

function getMenu(prefix){
return `
*${config.botName} MENU*

Owner: ${config.ownerName}
Prefix: ${prefix}

*GENERAL*
${prefix}ping
${prefix}alive
${prefix}owner
${prefix}menu

*GROUP*
${prefix}hidetag
${prefix}promote
${prefix}demote
${prefix}kick
${prefix}link
${prefix}antidelete

*DOWNLOADER*
${prefix}ytmp4
${prefix}ytmp3
${prefix}tiktok
${prefix}fb
${prefix}insta

Powered by SHADOW`.trim();
}

export const menu = {
  command: "menu",
  run: async (sock, m) => {
    await sock.sendMessage(m.key.remoteJid, { text: getMenu(config.prefix) }, { quoted: m });
  }
};

export const ping = {
  command: "ping",
  run: async (sock, m) => {
    let s = Date.now();
    let msg = await sock.sendMessage(m.key.remoteJid, { text: "Pinging..." }, { quoted: m });
    await sock.sendMessage(m.key.remoteJid, { text: `PONG! ${Date.now()-s}ms`, edit: msg.key });
  }
};

export const alive = {
  command: "alive",
  run: async (sock, m) => {
    await sock.sendMessage(m.key.remoteJid, { text: `*${config.botName} is Alive ✅*\nOwner: ${config.ownerName}` }, { quoted: m });
  }
};

export const antidelete = {
  command: "antidelete",
  alias: ["ad"],
  run: async (sock, m) => {
    let txt = (m.body || "").toLowerCase();
    if(txt.includes("on") || txt.includes("allon")){
      return await sock.sendMessage(m.key.remoteJid, { text: "✅ *ANTIDELETE ALL ON*\nHar jagah ON!" }, { quoted: m });
    }
    if(txt.includes("off")){
      return await sock.sendMessage(m.key.remoteJid, { text: "❌ *ANTIDELETE OFF*" }, { quoted: m });
    }
    return await sock.sendMessage(m.key.remoteJid, { text: "*ANTIDELETE*\n.antidelete on\n.antidelete allon\n.antidelete off" }, { quoted: m });
  }
};

// SIRF EK BAAR export default - YEHI FAIL FIX HAI
export default menu;