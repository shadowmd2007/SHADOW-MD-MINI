import config from '../config.js';

const ping = async (sock, m) => {
  const start = Date.now();
  await new Promise(r=>setTimeout(r, 300));
  const speed = Date.now() - start;

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
ping.execute = ping;