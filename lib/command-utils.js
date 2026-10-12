export function getText(m) {
  if (!m) return '';
  if (m.message) {
    return m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || '';
  }
  return m.text || m.body || '';
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
    if (!c || typeof c!== 'string') return false;
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}

export function isValidCommand(name) {
  return typeof name === 'string' && name.length > 0;
}

export default { getText, jidNumber, isGroupAdmin, filterCommands, isValidCommand };