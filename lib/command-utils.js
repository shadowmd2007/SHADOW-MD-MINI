// Simple command-utils - Auto upload ke liye bas itna kaafi hai
// Handler ab isko auto patch kar deta hai

export const reply = async (sock, msg, text) => {
  return await sock.sendMessage(msg.key.remoteJid, { text: String(text || '') }, { quoted: msg });
};

export const requireBotAdmin = async () => true;
export const requireGroupAdmin = async () => true;
export const isGroup = (jid) => jid?.endsWith('@g.us');

export default { reply, requireBotAdmin, requireGroupAdmin, isGroup };