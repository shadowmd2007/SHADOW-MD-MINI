export function getText(m) {
  return m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || '';
}

export function jidNumber(jid = '') {
  if (!jid) return '';
  return jid.split('@')[0].split(':')[0];
}

export function isGroupAdmin(participants, jid) {
  if (!participants ||!jid) return false;
  const num = jidNumber(jid);
  return participants.some(p => jidNumber(p.id) === num && (p.admin === 'admin' || p.admin === 'superadmin'));
}

export function filterCommands(commands) {
  const seen = new Set();
  return commands.filter(c => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

export function isValidCommand(name) {
  return typeof name === 'string' && name.length > 0;
}

// === FIX: Ye 3 line se 74 commands load honge ===
export function reply(m, text) {
  return m.reply(text);
}

export const send = reply;
export const sendMessage = reply;

export default { getText, jidNumber, isGroupAdmin, filterCommands, isValidCommand, reply, send, sendMessage };