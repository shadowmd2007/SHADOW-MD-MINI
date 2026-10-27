import config from '../config.js';

function getMenu(prefix) {
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

*POWERED BY RANA FURQAN MD*
`.trim();
}

export const menu = {
  command: "menu",
  run: async (sock, m) => {
    await sock.sendMessage(
      m.key.remoteJid,
      { text: getMenu(config.prefix) },
      { quoted: m }
    );
  }
};

export const ping = {
  command: "ping",
  run: async (sock, m) => {
    const start = Date.now();

    await sock.sendMessage(
      m.key.remoteJid,
      { text: `PONG! ${Date.now() - start}ms` },
      { quoted: m }
    );
  }
};

export const alive = {
  command: "alive",
  run: async (sock, m) => {
    await sock.sendMessage(
      m.key.remoteJid,
      {
        text: `*${config.botName} is Alive ✅*\nOwner: ${config.ownerName}\n*Powered by RANA FURQAN MD*`
      },
      { quoted: m }
    );
  }
};

export const antidelete = {
  command: "antidelete",
  alias: ["ad"],
  run: async (sock, m) => {
    const args = (m.body || "").trim().split(/\s+/);
    const option = (args[1] || "").toLowerCase();

    if (option === "on" || option === "allon") {
      await sock.sendMessage(
        m.key.remoteJid,
        { text: "✅ *ANTIDELETE ON*\nNote: Actual deleted-message recovery requires an antidelete handler." },
        { quoted: m }
      );
      return;
    }

    if (option === "off") {
      await sock.sendMessage(
        m.key.remoteJid,
        { text: "❌ *ANTIDELETE OFF*" },
        { quoted: m }
      );
      return;
    }

    await sock.sendMessage(
      m.key.remoteJid,
      {
        text: "*ANTIDELETE*\n.antidelete on\n.antidelete allon\n.antidelete off\n\n*Powered by RANA FURQAN MD*"
      },
      { quoted: m }
    );
  }
};

export default menu;