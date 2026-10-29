
export const command = {
  name: 'vv3',
  aliases: ['viewonce3'],
  category: 'GENERAL',
  description: 'Send replied view-once media to original sender',

  run: async (ctx) => {
    const quoted = ctx.quoted;

    if (!quoted?.message) {
      return ctx.reply(
        '⚠️ One-time photo/video/voice par reply karke .vv3 bhejein.'
      );
    }

    let target;

    if (quoted.key?.remoteJid?.endsWith('@g.us')) {
      target = quoted.key.participant;
    } else {
      target = quoted.key?.remoteJid;
    }

    if (!target || target === 'status@broadcast') {
      return ctx.reply('❌ Original sender nahi mila.');
    }

    let m = quoted.message;

    for (let i = 0; i < 8; i++) {
      if (m?.ephemeralMessage?.message) {
        m = m.ephemeralMessage.message;
      } else if (m?.viewOnceMessage?.message) {
        m = m.viewOnceMessage.message;
      } else if (m?.viewOnceMessageV2?.message) {
        m = m.viewOnceMessageV2.message;
      } else if (m?.viewOnceMessageV2Extension?.message) {
        m = m.viewOnceMessageV2Extension.message;
      } else {
        break;
      }
    }

    let media;

    if (m?.imageMessage) {
      media = {
        image: { ...m.imageMessage, viewOnce: false },
        caption: m.imageMessage.caption || ''
      };
    } else if (m?.videoMessage) {
      media = {
        video: { ...m.videoMessage, viewOnce: false },
        caption: m.videoMessage.caption || ''
      };
    } else if (m?.audioMessage) {
      media = {
        audio: { ...m.audioMessage, viewOnce: false },
        mimetype: m.audioMessage.mimetype || 'audio/ogg',
        ptt: Boolean(m.audioMessage.ptt)
      };
    }

    if (!media) {
      return ctx.reply(
        '❌ Media recover nahi hui ya supported format mein nahi hai.'
      );
    }

    await ctx.sock.sendMessage(target, media);
    return ctx.reply('✅ Original sender ko media send karne ki request complete hui.');
  }
};

export default { command };
