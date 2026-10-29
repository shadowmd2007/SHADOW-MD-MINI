import { config } from '../config.js';

export const name = "vv3";
export const category = "security";
export const desc = "Send as ViewOnce (one time pic/video/voice)";

// WAHI 17 BEHTAREEN WORDS
const BEAUTIFUL_WORDS = [
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

export async function execute(sock, msg, args, extra) {
  const jid = msg.key.remoteJid;
  const ctx = msg.message?.extendedTextMessage?.contextInfo;

  if (!ctx?.quotedMessage) {
    await sock.sendMessage(jid, {
      text: `*🔒 RANA VV3 - MAKE VIEWONCE 🔒*\n\n*Use:*\n*1.* Kisi Photo/Video/Voice ko Reply karo\n*2.* _.vv3_ likho\n*3.* Uske paas One Time me chali jayegi\n\n*Example:*\nPhoto pe Reply > .vv3\n\n> _17 Words: MashaAllah, SubhanAllah, Cute, Nice etc add hain_\n> _Meri JAAN 🌹_`
    }, { quoted: msg });
    return;
  }

  try {
    let qMsg = ctx.quotedMessage;
    if (qMsg.ephemeralMessage) qMsg = qMsg.ephemeralMessage.message;
    
    const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
    const pino = (await import('pino')).default;
    const logger = pino({ level: 'silent' });

    const target = { key: { id: ctx.stanzaId, remoteJid: jid }, message: qMsg };
    const buffer = await downloadMediaMessage(target, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });

    const randomWord = BEAUTIFUL_WORDS[Math.floor(Math.random() * BEAUTIFUL_WORDS.length)];

    await sock.sendMessage(jid, { text: `🔒 *Making ViewOnce...* ${randomWord}` }, { quoted: msg });

    if (qMsg.imageMessage) {
      await sock.sendMessage(jid, {
        image: buffer,
        caption: `${randomWord}\n\n> _${config.botName} - One Time_\n> _Meri JAAN 🌹_`,
        viewOnce: true
      }, { quoted: msg });
      
    } else if (qMsg.videoMessage) {
      await sock.sendMessage(jid, {
        video: buffer,
        caption: `${randomWord}\n\n> _One Time Video - ${config.botName}_\n> _Meri JAAN 🌹_`,
        viewOnce: true
      }, { quoted: msg });

    } else if (qMsg.audioMessage || qMsg.pttMessage || qMsg.voiceMessage) {
      await sock.sendMessage(jid, {
        audio: buffer,
        mimetype: 'audio/ogg; codecs=opus',
        ptt: true,
        viewOnce: true
      }, { quoted: msg });

    } else if (qMsg.stickerMessage) {
      // Sticker ko image bana ke viewonce bhejo
      await sock.sendMessage(jid, {
        image: buffer,
        caption: `${randomWord}\n\n> _Sticker as One Time_\n> _Meri JAAN 🌹_`,
        viewOnce: true
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: `❌ Sirf Photo/Video/Voice pe reply karke .vv3 likho` }, { quoted: msg });
      return;
    }

    await sock.sendMessage(jid, { text: `✅ *Sent as One Time!* ${randomWord} \nAb uske paas 1 baar khulegi phir gayab 🌹` }, { quoted: msg });

  } catch (e) {
    console.log("VV3 Error:", e.message);
    await sock.sendMessage(jid, { text: `❌ VV3 Fail: ${e.message}\n\nPhoto/Video ko reply karke .vv3 likho\nMeri JAAN 🌹` }, { quoted: msg });
  }
}

export default { name, execute };