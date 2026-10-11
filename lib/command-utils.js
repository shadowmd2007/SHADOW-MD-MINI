export const commands = new Map();
export function getCommand(name) { return commands.get(name); }
export default { commands, getCommand };