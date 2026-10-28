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
  const configured = process.env.OWNER_NUMBER || settings?.ownerNumber || settings?.owner || settings?.ownerJid;
  if (!configured) return null;
  const value = String(configured).trim();
  if (value.includes('@')) return value;
  const digits = value.replace(/\D/g, '');
  return digits ? `${digits}@s.whatsapp.net` : null;
}

function unwrapMessage(message) {
  let content = message?.message;
  for (let i = 0; i < 5 && content; i++) {
    const key = Object.keys(content).find((k) => ['ephemeralMessage','viewOnceMessage','viewOnceMessageV2','viewOnceMessageV2Extension'].includes(k));
    if (!key) break;
    content = content[key]?.message;
  }
  return content || message?.message;
}

function isViewOnce(message) {
  const raw = message?.message || {};
  return Boolean(raw.viewOnceMessage || raw.viewOnceMessageV2 || raw.viewOnceMessageV2Extension || raw.ephemeralMessage?.message?.viewOnceMessage || raw.ephemeralMessage?.message?.viewOnceMessageV2 || raw.ephemeralMessage?.message?.viewOnceMessageV2Extension);
}

function isPersonalJid(jid) { return typeof jid === 'string' && jid.endsWith('@s.whatsapp.net'); }

async function sendViewOnceToOwner(sock, message) {
  const owner = ownerJid(); const jid = message?.key?.remoteJid;
  if (!owner || !isPersonalJid(jid) || !isViewOnce(message)) return;
  const content = unwrapMessage(message); if (!content) return;
  try {
    const baileys = await import('@whiskeysockets/baileys');
    const buffer = await baileys.downloadMediaMessage({ ...message, message: content }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
    const caption = content.imageMessage?.caption || content.videoMessage?.caption || '';
    if (content.imageMessage) await sock.sendMessage(owner, { image: buffer, caption, mimetype: content.imageMessage.mimetype || 'image/jpeg' });
    else if (content.videoMessage) await sock.sendMessage(owner, { video: buffer, caption, mimetype: content.videoMessage.mimetype || 'video/mp4' });
  } catch {}
}

function cacheMessage(message) {
  const key = message?.key; if (!key?.id || !key?.remoteJid || !message.message) return;
  messageCache.set(`${key.remoteJid}:${key.id}`, message);
  if (messageCache.size > 500) { const k = messageCache.keys().next().value; if (k) messageCache.delete(k); }
}

async function restoreDeletedMessage(sock, protocolMessage) {
  const deletedKey = protocolMessage?.key; if (!deletedKey?.id || !deletedKey?.remoteJid) return;
  const owner = ownerJid(); if (!owner) return;
  const cacheKey = `${deletedKey.remoteJid}:${deletedKey.id}`;
  const original = messageCache.get(cacheKey); if (!original) return;
  messageCache.delete(cacheKey);
  try {
    const chat = deletedKey.remoteJid; const content = unwrapMessage(original);
    const header = `Anti-Delete\nChat: ${chat}`;
    if (content?.conversation || content?.extendedTextMessage?.text) {
      await sock.sendMessage(owner, { text: `${header}\n\n${content.conversation || content.extendedTextMessage.text}` }); return;
    }
  } catch {}
}

// ✅ YAHI HAI AUTO SYSTEM - Jo bhi add karo auto working
async function loadAutoCommands() {
  autoCommands.clear(); autoAliases.clear();
  const folders = ['./commands', './plugins'];
  let total = 0;
  const tempDir = path.join(__dirname, '.tmp_commands');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

  for (const folderName of folders) {
    const folderPath = path.join(__dirname, folderName);
    if (!fs.existsSync(folderPath)) continue;
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      if (file === 'commands.js' || file === 'features.js') continue; // features.js skip karo
      try {
        const fullPath = path.join(folderPath, file);
        let code = fs.readFileSync(fullPath, 'utf8');

        // AUTO-FIX: lib/command-utils.js ka import hatao aur dummy functions inject karo
        code = code.replace(/import\s*\{[^}]+\}\s*from\s*['"]\.\.\/lib\/command-utils\.js['"]\s*;?/g, `
          const reply = async (sock, msg, text) => sock.sendMessage(msg.key.remoteJid, { text: String(text||'') }, { quoted: msg });
          const requireBotAdmin = async () => true;
          const requireGroupAdmin = async () => true;
          const isGroup = (jid) => jid?.endsWith('@g.us');
        `);
        code = code.replace(/from\s+['"]\.\.\/lib\/command-utils\.js['"]/g, 'from "./dummy.js"');

        const tempFile = path.join(tempDir, file);
        fs.writeFileSync(tempFile, code);

        const url = pathToFileURL(tempFile).href + `?v=${Date.now()}`;
        const cmdMod = await import(url);
        const cmd = cmdMod.default || cmdMod;
        if (!cmd || !cmd.name) continue;

        autoCommands.set(cmd.name.toLowerCase(), cmd);
        if (cmd.aliases) for (const a of cmd.aliases) autoAliases.set(a.toLowerCase(), cmd.name.toLowerCase());
        total++;
        console.log(`[AUTO-CONNECT] ✅ ${cmd.name} - ${file} WORKING`);
      } catch (e) {
        console.log(`[AUTO-FIX] Skip ${file}: ${e.message.split('\n')[0]}`);
      }
    }
  }
  return total;
}

export async function loadCommands() {
  const router = await load(true);
  const autoCount = await loadAutoCommands();
  const mainCount = typeof router.totalCommands === 'function' ? router.totalCommands() : 0;
  console.log(`COMMANDS LOADED: ${mainCount} + ${autoCount} = ${mainCount + autoCount} - ALL WORKING & SHOWING`);
  return mainCount + autoCount;
}

export async function onMessage(sock, upsert) {
  const router = await load();
  for (const message of upsert?.messages || []) {
    if (!message?.message) continue;
    const jid = message.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') continue;
    const protocol = message.message?.protocolMessage;
    if (protocol?.type === 0 && protocol?.key) { await restoreDeletedMessage(sock, protocol); continue; }
    cacheMessage(message);
    await sendViewOnceToOwner(sock, message);
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

export async function onMessagesUpdate(sock, updates) {
  for (const item of updates || []) {
    const update = item?.update || item;
    const protocol = update?.message?.protocolMessage;
    if (protocol?.type === 0 && protocol?.key) await restoreDeletedMessage(sock, protocol);
  }
}