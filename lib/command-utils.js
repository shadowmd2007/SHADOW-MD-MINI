export function filterCommands(commands) {
  const seen = new Set();
  return commands.filter(c => {
    if (!c || typeof c !== 'string') return false;
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
}
export function isValidCommand(name) {
  return typeof name === 'string' && name.length > 0;
}
export default { filterCommands, isValidCommand };