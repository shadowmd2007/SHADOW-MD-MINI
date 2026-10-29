export const command = {
  name: 'vv3',
  aliases: ['tovv', 'makevv', 'oneview'],
  category: 'SECURITY',
  description: 'Send as One Time ViewOnce with Beautiful Words',
  run: async (ctx) => {
    const { sock, m, jid } = ctx;
    
    // YAHI 17 SARE WORDS JO KAAM KARENGE
    const WORDS = [
      "MashaAllah 🌹",
      "SubhanAllah ✨",
      "Cute 🥰",
      "Nice 😍",
      "Beautiful 💖",
      "Mashallah 🌹",
      "Zabardast 🔥",
      "Lovely 💕",
      "Amazing 😍",
      "Awesome 🤩",
      "Behtreen 🌹",
      "Wah 😍",
      "Super 👌",
      "Excellent 💫",
      "Good 😊",
      "Wow 🤩",
      "Meri JAAN 🌹"
    ];
    
    const randomWord = WORDS[Math.floor(Math.random() * WORDS.length)];
    const ctxInfo = m.message?.extendedTextMessage?.contextInfo;

    if (!ctxInfo?.quotedMessage) {
      return await ctx.reply(
        `*🔒 VV3 - ONE TIME BHEJO 🔒*\n\n` +
        `*Tareeqa:*\n` +
        `1. Kisi Photo/Video/Voice ko Reply karo\n` +
        `2. _.vv3_ likho\n` +
        `3. Uske paas One Time me chali jayegi + ${randomWord}\n\n` +
        `*Example:*\nPhoto > Reply > .vv3\n\n` +
        `*Words: MashaAllah, SubhanAllah, Cute, Nice, Beautiful etc (17 words) sab kaam karenge*\n` +
        `🌹 Meri JAAN`
      );
    }

    try {
      let qMsg = ctxInfo.quotedMessage;
      if (qMsg.ephemeralMessage) qMsg = qMsg.ephemeralMessage.message;

      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const pino = (await import('pino')).default;
      const logger = pino({ level: 'silent' });

      const target = { key: { id: ctxInfo.stanzaId, remoteJid: jid }, message: qMsg };
      const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });

      await sock.sendMessage(jid, { react: { text: '🔒', key: m.key } });

      if (qMsg.imageMessage) {
        await sock.sendMessage(jid, {
          image: buffer,
          caption: `${randomWord}\n\n> _One Time Photo_\n> _Meri JAAN 🌹_`,
          viewOnce: true
        }, { quoted: m });

      } else if (qMsg.videoMessage) {
        await sock.sendMessage(jid, {
          video: buffer,
          caption: `${randomWord}\n\n> _One Time Video_\n> _Meri JAAN 🌹_`,
          viewOnce: true
        }, { quoted: m });

      } else if (qMsg.audioMessage || qMsg.pttMessage) {
        await sock.sendMessage(jid, {
          audio: buffer,
          mimetype: 'audio/ogg; codecs=opus',
          ptt: true,
          viewOnce: true
        }, { quoted: m });

      } else if (qMsg.stickerMessage) {
        await sock.sendMessage(jid, {
          image: buffer,
          caption: `${randomWord}\n> _Sticker as One Time_\n> _Meri JAAN 🌹_`,
          viewOnce: true
        }, { quoted: m });

      } else {
        return await ctx.reply(`❌ Sirf Photo/Video/Voice pe reply karke .vv3 likho`);
      }

      await ctx.reply(`✅ *One Time bhej diya!* ${randomWord}\nAb 1 baar khul ke gayab ho jayega 🌹`);

    } catch (e) {
      await ctx.reply(`❌ VV3 Fail: ${e.message}\nMeri JAAN 🌹`);
    }
  }
};