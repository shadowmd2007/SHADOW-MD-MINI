export default {
  name: "test",
  aliases: ["t", "test2"],
  category: "main",
  async execute(sock, m, args, { prefix }) {
    
    const testText = `╭─🌹─ *TEST SUCCESS* ─🌹─╮
│
│ ✅ *Status:* WORKING
│ 🤖 *Bot:* RANA FURQAN MD
│ 📡 *Command:* ${prefix}test
│ ⚡ *Speed:* Fast
│ 👑 *Owner:* RANA FURQAN
│
╰─🌹──────────────🌹─╯

🌹 *POWERED BY MERI JAAN* 🌹`;

    await sock.sendMessage(m.key.remoteJid, {
      image: { url: "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg" },
      caption: testText,
      contextInfo: {
        externalAdReply: {
          title: '🌹 TEST PASSED 🌹',
          body: 'Powered by Meri Jaan',
          thumbnailUrl: "https://i.ibb.co/1p9q3bL8/rana-furqan.jpg",
          sourceUrl: 'https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J',
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });
  }
}