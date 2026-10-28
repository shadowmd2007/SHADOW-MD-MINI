import config from '../config.js';

const ping = async (sock, m) => {
  const start = Date.now();
  const end = Date.now();
  const speed = end - start;

  const pingText = `╭─🌹─ *PONG!* ─🌹─╮
│
│ ⚡ *Speed:* ${speed}ms
│ 🤖 *Bot:* RANA FURQAN MD
│ 👑 *Owner:* RANA FURQAN
│ 💖 *Meri Jaan*
│ 📡 *Status:* ONLINE
│ 🌹 *Prefix:* ${config.prefix}
│
╰─🌹─────────────🌹─╯

🌹 *BOT BY RANA FURQAN MD* 🌹`;

  await sock.sendMessage(m.key.remoteJid, {
    image: { url: config.botImage },
    caption: pingText,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363319314627663@newsletter',
        newsletterName: 'RANA FURQAN MD - MERI JAAN',
        serverMessageId: 1
      },
      externalAdReply: {
        title: '🌹 RANA FURQAN MD 🌹',
        body: '📢 Channel View Karo - Meri Jaan',
        thumbnailUrl: config.botImage,
        sourceUrl: 'https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J',
        mediaType: 1,
        renderLargerThumbnail: true,
        showAdAttribution: true
      }
    }
  }, { quoted: m });
};

export default ping;
ping.command = ['ping', 'speed', 'pong', 'ping2'];
ping.execute = ping; // Ye line important hai - Is se .ping working hoga