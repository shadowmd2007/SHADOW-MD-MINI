// FIX - Ab saare 78 commands load honge, 3 nahi
export function filterCommands(commands) {
  return commands; // Pehle ye 3 tak limit kar raha tha, ab full return
}

export function isValidCommand(name) {
  return typeof name === 'string' && name.length > 0;
}

export function reply(m, text) {
  return m.reply(text);
}

export const sendMessage = reply;

export default { getText: (m) => m.body || '', jidNumber: (jid) => jid.split('@')[0], isValidCommand, filterCommands, sendMessage, reply };