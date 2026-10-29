
const WORDS = [
  'mashallah', 'mashaallah', 'ma sha allah', 'masha allah',
  'subhanallah', 'alhamdulillah', 'cute', 'nice', 'handsome',
  'beautiful', 'lovely', 'amazing', 'excellent', 'zabardast',
  'behtareen', 'behtarin', 'wah', 'wow', 'best', 'good',
  'great', 'awesome', 'super', 'adorable', 'sweet', 'pretty',
  'gorgeous', 'perfect', 'brilliant', 'fantastic', 'wonderful',
  'cool', 'very nice', 'very beautiful', 'incredible',
  'mind blowing', 'shandar', 'khoobsurat', 'pyara', 'pyari',
  'kamaal', 'wah wah', 'queen', 'king', 'too good',
  'nice pic', 'so cute', 'uff', '😍', '🥰', '❤️', '🔥',
  '💖', '😘', '✨', '🌹', '💯', '👏', '🤩'
];

export const command = {
  name: 'vv2',
  aliases: ['viewonce2'],
  category: 'OWNER',
  description: 'Send replied view-once media to owner personal chat',

  run: async (ctx) => {
    const owner =
      process.env.OWNER_NUMBER ||
      ctx.config?.ownerNumber ||
      ctx.config?.owner;

    if (!owner) {
      return ctx.reply(
        '❌ Railway Variables mein OWNER_NUMBER set karein.'
      );
    }

    const ownerJid = owner.includes('@')
      ? owner
      : `${owner.replace(/\D/g, '')}@s.whatsapp.net`;

    const quoted = ctx.quoted;

    if (!quoted?.message) {
      return ctx.reply(
        '⚠️ One-time photo/video/voice par reply karke .vv2 bhejein.'
      );
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
        '❌ Media recover nahi hui. WhatsApp/Baileys har view-once media ko dobara available nahi karte.'
      );
    }

    await ctx.sock.sendMessage(ownerJid, media);
    return ctx.reply('✅ Owner ke personal chat par send kar diya.');
  }
};

export default { command };
