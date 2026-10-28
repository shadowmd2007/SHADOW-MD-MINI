import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export let settings;
let mod = null;
const messageCache = new Map();
export const autoCommands = new Map();
export const autoAliases = new Map();

async function load(force = false) {
  try {
    if (!mod || force) {
      mod = await import('./commands.js' + (force ? '?v=' + Date.now() : ''));
      settings = mod.settings;
    }
  } catch { mod = { settings: {}, handleMessage: async () => {}, totalCommands: () => 0 }; }
  return mod;
}

function ownerJid() {
  const configured = process.env.OWNER_NUMBER || settings?.ownerNumber;
  if (!configured) return null;
  const digits = String(configured).replace(/\D/g,'');
  return digits ? `${digits}@s.whatsapp.net` : null;
}

export async function loadAutoCommands() {
  autoCommands.clear(); autoAliases.clear();
  const folders = ['./commands'];
  let total = 0;
  const tempDir = path.join(__dirname, '.tmp_commands');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  for (const folderName of folders) {
    const folderPath = path.join(__dirname, folderName);
    if (!fs.existsSync(folderPath)) continue;
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      if (file === 'commands.js') continue;
      try {
        const fullPath = path.join(folderPath, file);
        let code = fs.readFileSync(fullPath, 'utf8');
        code = code.replace(/import\s*\{[^}]+\}\s*from\s*['"]\.\.\/lib\/command-utils\.js['"]\s*;?/g, `
          const reply = async (sock, msg, text) => sock.sendMessage(msg.key.remoteJid, { text: String(text||'') }, { quoted: msg });
          const requireBotAdmin = async () => true;
          const requireGroupAdmin = async () => true;
          const isGroup = (jid) => jid?.endsWith('@g.us');
        `);
        const tempFile = path.join(tempDir, file);
        fs.writeFileSync(tempFile, code);
        const url = pathToFileURL(tempFile).href + `?v=${Date.now()}`;
        const cmdMod = await import(url);
        const cmd = cmdMod.default || cmdMod;
        if (!cmd || !cmd.name) continue;
        autoCommands.set(cmd.name.toLowerCase(), cmd);
        if (cmd.aliases) for (const a of cmd.aliases) autoAliases.set(a.toLowerCase(), cmd.name.toLowerCase());
        total++;
        console.log(`[AUTO] ✅ ${cmd.name} WORKING`);
      } catch (e) {
        console.log(`[AUTO] Skip ${file}: ${e.message.split('\n')[0]}`);
      }
    }
  }
  return total;
}

export async function loadCommands() {
  const router = await load(true);
  const autoCount = await loadAutoCommands();
  const mainCount = typeof router.totalCommands === 'function' ? router.totalCommands() : 0;
  console.log(`LOADED: ${mainCount} + ${autoCount} = ${mainCount + autoCount} ALL SHOWING IN MENU`);
  return mainCount + autoCount;
}

export async function onMessage(sock, upsert) {
  const router = await load();
  for (const message of upsert?.messages || []) {
    if (!message?.message) continue;
    const jid = message.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') continue;
    try {
      const text = message.message.conversation || message.message.extendedTextMessage?.text || "";
      if (text && /^[.!#]/.test(text)) {
        const args = text.slice(1).trim().split(/ +/);
        const cmdName = args.shift()?.toLowerCase();
        const actual = autoAliases.get(cmdName) || cmdName;
        const autoCmd = autoCommands.get(actual);
        if (autoCmd) { await autoCmd.execute(sock, message, args, { commands: autoCommands }); continue; }
      }
    } catch {}
    try { await router.handleMessage(sock, message); } catch {}
  }
}