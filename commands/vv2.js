import { config } from '../config.js';

export const name = "vv2";
export const category = "security";
export const desc = "Open ViewOnce with beautiful words";

// TUMHARE 17 BEHTAREEN WORDS
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
      text: `*❌ RANA VV2 GUIDE ❌*\n\n*1.* ViewOnce photo/video pe long press karo\n*2.* Reply pe click karo\n*3.* _.vv2_ likh ke send karo\n\n*Example:*\nPhoto > Reply > .vv2\n\n🌹 Meri JAAN 🌹`
    }, { quoted: msg });
    return;
  }

  try {
    let targetMsg = ctx.quotedMessage;
    
    // ViewOnce ko unwrap karo
    if (targetMsg.viewOnceMessageV2) targetMsg = targetMsg.viewOnceMessageV2.message;
    if (targetMsg.viewOnceMessage) targetMsg = targetMsg.viewOnceMessage.message;
    if (targetMsg.ephemeralMessage) targetMsg = targetMsg.ephemeralMessage.message;
    if (targetMsg.viewOnceMessageV2) targetMsg = targetMsg.viewOnceMessageV2.message;

    const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
    const pino = (await import('pino')).default;
    const logger = pino({ level: 'silent' });
    
    const target = { 
      key: { id: ctx.stanzaId, remoteJid: jid }, 
      message: targetMsg 
    };

    await sock.sendMessage(jid, { text: `🔓 *Opening ViewOnce...*\n⏳ Please wait` }, { quoted: msg });

    const buffer = await downloadMediaMessage(target, 'buffer', {}, { 
      logger, 
      reuploadRequest: sock.updateMediaMessage 
    });

    // Random beautiful word pick karo
    const randomWord = BEAUTIFUL_WORDS[Math.floor(Math.random() * BEAUTIFUL_WORDS.length)];

    const isImage = targetMsg.imageMessage;
    const isVideo = targetMsg.videoMessage;

    if (isImage) {
      await sock.sendMessage(jid, {
        image: buffer,
        caption: `*🔓 ViewOnce Opened*\n\n*${randomWord}*\n\n> _${config.botName}_\n> _Powered by Meri JAAN 🌹_`
      }, { quoted: msg });
    } else if (isVideo) {
      await sock.sendMessage(jid, {
        video: buffer,
        caption: `*🔓 ViewOnce Video Opened*\n\n*${randomWord}*\n\n> _${config.botName}_\n> _Meri JAAN 🌹_`
      }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, {
        text: `*🔓 ViewOnce Opened*\n\n*${randomWord}*\n\n_Media type unknown but opened_\nMeri JAAN 🌹`
      }, { quoted: msg });
    }

  } catch (e) {
    console.log("VV2 Error:", e.message);
    await sock.sendMessage(jid, {
      text: `*❌ VV2 Failed*\n\nError: ${e.message}\n\n*Tip:* ViewOnce message ko reply karke .vv2 likho\n\nMeri JAAN 🌹`
    }, { quoted: msg });
  }
}

export default { name, execute };