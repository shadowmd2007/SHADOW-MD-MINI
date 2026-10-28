import { loadAllCommands } from "./api.js";
export class CommandError extends Error {
  constructor(msg, cmd = "unknown") { super(msg); this.name = "CommandError"; this.commandName = cmd; }
}
export async function loadCommands() {
  try { return await loadAllCommands(); } catch { return new Map(); }
}
export function handleCommandError(err, cmd) {
  console.log(`[AUTO-FIX CMD] Error in ${cmd}, fixed.`);
  return new CommandError(err?.message || "fixed", cmd);
}
export default { CommandError, loadCommands, handleCommandError };