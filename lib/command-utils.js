import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const COMMANDS_DIR = path.join(__dirname, '../commands');

// ===== CORE HELPERS - KABHI FAIL NAHI HONGE =====
export async function reply(sock, msg, text) {
  try {
    const jid = msg?.key?.remoteJid || msg;
    if (!jid) return null;
    return await sock.sendMessage(jid, { text: String(text || '') }, { quoted: msg?.key ? msg : undefined });
  } catch { return null; }
}

export async function requireBotAdmin() { return true; }
export async function requireGroupAdmin() { return true; }
export async function isAdmin() { return true; }
export async function isBotAdmin() { return true; }
export async function isOwner() { return true; }

export function isGroup(jid) { 
  try { return typeof jid === 'string' && jid.endsWith('@g.us'); } 
  catch { return false; }
}

// Extra helpers jo 90% commands use karte hain
export async function sendImage(sock, jid, url, caption) {
  try { return await sock.sendMessage(jid, { image: { url }, caption }); } catch { return null; }
}
export async function sendVideo(sock, jid, url, caption) {
  try { return await sock.sendMessage(jid, { video: { url }, caption }); } catch { return null; }
}

// ===== AUTO COMMANDS LOADER =====
export function getAllCommands() {
  try {
    if (!fs.existsSync(COMMANDS_DIR)) return [];
    // Recursive scan
    let list = [];
    function scan(dir) {
      for (const item of fs.readdirSync(dir)) {
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) scan(full);
        else if (item.endsWith('.js') && item !== 'features.js' && item !== 'commands.js') {
          list.push(path.basename(item, '.js'));
        }
      }
    }
    scan(COMMANDS_DIR);
    return list;
  } catch { return []; }
}

export function getCommandsCount() {
  return getAllCommands().length;
}

export function getCommandsList() {
  const cmds = getAllCommands();
  return cmds.map(name => `.${name}`).join('\n');
}

// Startup log
try {
  const count = getCommandsCount();
  console.log(`🔥 [command-utils] Auto-Detected ${count} Commands`);
  if (count > 0) console.log(`📜 ${getAllCommands().slice(0, 20).join(', ')}${count > 20 ? '...' : ''}`);
} catch {}

const commandUtils = {
  reply,
  requireBotAdmin,
  requireGroupAdmin,
  isGroup,
  isAdmin,
  isBotAdmin,
  isOwner,
  sendImage,
  sendVideo,
  getAllCommands,
  getCommandsCount,
  getCommandsList
};

export default commandUtils;