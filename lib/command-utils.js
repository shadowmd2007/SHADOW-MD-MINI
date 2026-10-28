import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMMANDS_DIR = path.join(__dirname, '../commands');

// ===== CORE HELPERS - KABHI FAIL NAHI HONGE =====
export async function reply(sock, msg, text) {
  try {
    const jid = msg.key.remoteJid;
    return await sock.sendMessage(jid, { text: String(text || '') }, { quoted: msg });
  } catch { return null; }
}
export async function requireBotAdmin() { return true; }
export async function requireGroupAdmin() { return true; }
export function isGroup(jid) { return typeof jid === 'string' && jid.endsWith('@g.us'); }

// ===== AUTO COMMANDS LOADER - SARE COMMANDS YAHAN SE AYENGE =====
export function getAllCommands() {
  try {
    if (!fs.existsSync(COMMANDS_DIR)) return [];
    const files = fs.readdirSync(COMMANDS_DIR).filter(f => f.endsWith('.js') && f !== 'features.js');
    return files.map(f => f.replace('.js', ''));
  } catch { return []; }
}

export function getCommandsCount() {
  return getAllCommands().length;
}

export function getCommandsList() {
  const cmds = getAllCommands();
  return cmds.map(name => `.${name}`).join('\n');
}

// Log karega kitne commands hain
try {
  const count = getCommandsCount();
  console.log(`🔥 [command-utils] Auto-Detected ${count} Commands from commands folder`);
  console.log(`📜 Commands: ${getAllCommands().join(', ')}`);
  console.log(`✅ New command add karoge to auto detect ho jayega - No need to edit this file`);
} catch {}

const commandUtils = {
  reply,
  requireBotAdmin,
  requireGroupAdmin,
  isGroup,
  getAllCommands,
  getCommandsCount,
  getCommandsList
};

export default commandUtils;