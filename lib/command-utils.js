// ✅ FINAL FIXED command-utils.js - All commands will connect

export const reply = async (sock, msg, text) => {
  const jid = msg.key.remoteJid;
  return await sock.sendMessage(jid, { text: String(text || '') }, { quoted: msg });
};

export const send = reply;
export const sendMessage = reply;

export const sendImage = async (sock, msg, buffer, caption = '') => {
  const jid = msg.key.remoteJid;
  return await sock.sendMessage(jid, { image: buffer, caption }, { quoted: msg });
};

export const sendVideo = async (sock, msg, buffer, caption = '') => {
  const jid = msg.key.remoteJid;
  return await sock.sendMessage(jid, { video: buffer, caption }, { quoted: msg });
};

export const sendAudio = async (sock, msg, buffer, ptt = false) => {
  const jid = msg.key.remoteJid;
  return await sock.sendMessage(jid, { audio: buffer, mimetype: 'audio/mp4', ptt }, { quoted: msg });
};

export const getText = (msg) => {
  return msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || '';
};

export const isGroup = (jid) => jid?.endsWith('@g.us');
export const isOwner = (jid, ownerNumber) => {
  if (!ownerNumber) return false;
  return String(jid).includes(String(ownerNumber).replace(/\D/g, ''));
};

export default { reply, send, sendMessage, sendImage, sendVideo, sendAudio, getText, isGroup, isOwner };