// FIX - Ab 77+ commands load honge
export function filterCommands(commands) {
  // Pehle ye 3 tak limit kar raha tha
  return commands;
}

export function isValidCommand(name) {
  return typeof name === 'string' && name.length > 0;
}

export function reply(m, text) {
  return m.reply(text);
}

export const sendMessage = reply;

export default { getText: (m) => m.body || m.text || '', jidNumber: (j) => j.split('@')[0], isValidCommand, filterCommands, sendMessage, reply };