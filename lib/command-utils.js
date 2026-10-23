export function getText(conversation) {
  let m = conversation;
  return m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || '';
}

export function jidNumber(jid = '') {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0];
}

export function isGroupAdmin(participants, jid) {
  if (!participants || !jid) return false;
  const num = jidNumber(jid);
  return participants.some(p => jidNumber(p.id) === num && (p.admin === 'admin' || p.admin === 'superadmin'));
}

// === FIX: Ab saare 77+ commands load honge, 3 nahi ===
export function filterCommands(commands) {
  // Pehle ye 3 commands tak limit kar raha tha, ab full return
  return commands;
}

export function isValidCommand(name) {
  return typeof name === 'string' && name.length > 0;
}

export function reply(m, text) {
  return m.reply(text);
}

export const send = reply;
export const sendMessage = reply;

export default { getText, jidNumber, isGroupAdmin, filterCommands, isValidCommand, reply, send, sendMessage };