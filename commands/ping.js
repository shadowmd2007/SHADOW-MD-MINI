import config from '../config.js';

const ping = async (sock, m) => {
  const start = Date.now();
  
  // Pehle pinging bhejo
  await sock.sendMessage(m.key.remoteJid, { 
    text: '🌹 *Pinging...* 🌹' 
  }, { quoted: m });
  
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

  // ✅ CHANNEL VIEW BUTTON KE SAATH
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
        sourceUrl: 'https://whatsapp.com/channel/0029VaKjE9p9xVJl0i8N3u2E',
        mediaType: 1,
        renderLargerThumbnail: true,
        showAdAttribution: true
      }
    }
  }, { quoted: m });

  // ✅ Dusra button - Channel ka direct link
  await sock.sendMessage(m.key.remoteJid, {
    text: `🌹 *Channel Follow Karo Bhai JAAN!* 🌹\n\n👇 Neeche link pe click karo 👇\n\nhttps://whatsapp.com/channel/0029VaKjE9p9xVJl0i8N3u2E\n\n💖 *RANA FURQAN MD - MERI JAAN*`,
    contextInfo: {
      externalAdReply: {
        title: '📢 RANA FURQAN MD CHANNEL',
        body: '🌹 Tap to View Channel 🌹',
        thumbnailUrl: config.botImage,
        sourceUrl: 'https://whatsapp.com/channel/0029VaKjE9p9xVJl0i8N3u2E',
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  });
};

export default ping;
ping.command = ['ping', 'speed', 'pong', 'ping2'];