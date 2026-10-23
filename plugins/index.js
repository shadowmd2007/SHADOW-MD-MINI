// MENU
export const menu = {
  command: ["menu","help","list"],
  run: async (sock, m, {config}) => {
    const menuText = `
╭───「 *${config.botName}* 」───
│ Prefix: ${config.prefix}
│ Owner: ${config.ownerName}
│ Commands: 77 Loaded
│
├─ *MAIN*
│ • ${config.prefix}menu
│ • ${config.prefix}ping
│ • ${config.prefix}alive
│ • ${config.prefix}owner
│ • ${config.prefix}script
│
├─ *GROUP*
│ • ${config.prefix}tagall
│ • ${config.prefix}hidetag
│ • ${config.prefix}promote
│ • ${config.prefix}demote
│ • ${config.prefix}kick
│ • ${config.prefix}link
│ • ${config.prefix}antilink
│
├─ *DOWNLOADER*
│ • ${config.prefix}ytmp3
│ • ${config.prefix}ytmp4
│ • ${config.prefix}tiktok
│ • ${config.prefix}fb
│ • ${config.prefix}insta
│
├─ *TOOLS*
│ • ${config.prefix}sticker
│ • ${config.prefix}toimg
│ • ${config.prefix}calc
│ • ${config.prefix}weather
│
╰─── Powered by SHADOW ───
`;
    await sock.sendMessage(m.key.remoteJid, { image: {url: config.menuImage}, caption: menuText }, {quoted: m});
  }
};

// PING
export const ping = {
  command: ["ping","speed"],
  run: async (sock, m) => {
    const start = Date.now();
    let msg = await sock.sendMessage(m.key.remoteJid, {text: "Pinging..."}, {quoted: m});
    const end = Date.now();
    await sock.sendMessage(m.key.remoteJid, {text: `*PONG!*\n${end-start}ms`, edit: msg.key});
  }
};

// ALIVE
export const alive = {
  command: ["alive","bot"],
  run: async (sock, m, {config}) => {
    await sock.sendMessage(m.key.remoteJid, {text: `*${config.botName} is Alive!* ⚡\n\nOwner: ${config.ownerName}\nVersion: 3.0.0\nStatus: Online ✅`}, {quoted: m});
  }
};

export default menu;