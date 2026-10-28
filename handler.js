import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export let settings;
let mod = null;
const messageCache = new Map();
const MAX_CACHE = 500;

// ✅ AUTO SYSTEM - Extra commands ke liye
export const autoCommands = new Map();
export const autoAliases = new Map();

async function load(force = false) {
  try {
    if (!mod || force) {
      mod = await import('./commands.js' + (force ? '?v=' + Date.now() : ''));
      settings = mod.settings;
    }
  } catch (e) {
    console.log('[AUTO-FIX] commands.js missing, auto fixed');
    mod = { settings: {}, handleMessage: async () => {}, totalCommands: () => 0 };
  }
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
    else if (content.audioMessage) await sock.sendMessage(owner, { audio: buffer, mimetype: content.audioMessage.mimetype || 'audio/ogg; codecs=opus', ptt: Boolean(content.audioMessage.ptt) });
  } catch (error) { console.error('View Once handler error:', error?.message || error); }
}

function cacheMessage(message) {
  const key = message?.key;
  if (!key?.id || !key?.remoteJid || !message.message) return;
  const cacheKey = `${key.remoteJid}:${key.id}`;
  messageCache.set(cacheKey, message);
  if (messageCache.size > MAX_CACHE) { const oldestKey = messageCache.keys().next().value; if (oldestKey) messageCache.delete(oldestKey); }
}

async function restoreDeletedMessage(sock, protocolMessage) {
  const deletedKey = protocolMessage?.key;
  if (!deletedKey?.id || !deletedKey?.remoteJid) return;
  const owner = ownerJid(); if (!owner) return;
  const cacheKey = `${deletedKey.remoteJid}:${deletedKey.id}`;
  const original = messageCache.get(cacheKey); if (!original) return;
  messageCache.delete(cacheKey);
  try {
    const chat = deletedKey.remoteJid; const sender = deletedKey.participant || chat;
    const content = unwrapMessage(original);
    const header = `Anti-Delete\nChat: ${chat}\nSender: ${sender}`;
    if (content?.conversation || content?.extendedTextMessage?.text) {
      const body = content.conversation || content.extendedTextMessage.text;
      await sock.sendMessage(owner, { text: `${header}\n\n${body}` }); return;
    }
    const mediaType = ['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage'].find((type) => content?.[type]);
    if (!mediaType) { await sock.sendMessage(owner, { text: `${header}\n\n[Unsupported]` }); return; }
    const baileys = await import('@whiskeysockets/baileys');
    const buffer = await baileys.downloadMediaMessage({ ...original, message: content }, 'buffer', {}, { logger: console, reuploadRequest: sock.updateMediaMessage });
    const media = content[mediaType];
    if (mediaType === 'imageMessage') await sock.sendMessage(owner, { image: buffer, caption: `${header}\n${media.caption || ''}` });
    else if (mediaType === 'videoMessage') await sock.sendMessage(owner, { video: buffer, caption: `${header}\n${media.caption || ''}` });
    else if (mediaType === 'audioMessage') await sock.sendMessage(owner, { audio: buffer, mimetype: media.mimetype || 'audio/ogg; codecs=opus', ptt: Boolean(media.ptt) });
    else if (mediaType === 'documentMessage') await sock.sendMessage(owner, { document: buffer, mimetype: media.mimetype || 'application/octet-stream', fileName: media.fileName || 'deleted-file' });
    else await sock.sendMessage(owner, { sticker: buffer });
  } catch (error) { console.error('Anti-Delete handler error:', error?.message || error); }
}

// ✅ AUTO SYSTEM - KAHIN BHI FILE HO AUTO CONNECT
async function loadAutoCommands() {
  autoCommands.clear(); autoAliases.clear();
  const folders = ['./commands', './plugins', './Commands', './Plugins'];
  let count = 0;
  for (const folderName of folders) {
    const folderPath = path.join(__dirname, folderName);
    if (!fs.existsSync(folderPath)) continue;
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js') && f !== 'commands.js');
    for (const file of files) {
      try {
        const fullPath = path.join(folderPath, file);
        const url = pathToFileURL(fullPath).href + `?v=${Date.now()}`;
        const cmdMod = await import(url);
        const cmd = cmdMod.default || cmdMod;
        if (!cmd || !cmd.name) continue;
        autoCommands.set(cmd.name.toLowerCase(), cmd);
        if (cmd.aliases) for (const a of cmd.aliases) autoAliases.set(a.toLowerCase(), cmd.name.toLowerCase());
        count++;
        console.log(`[AUTO-CONNECT] ✅ ${cmd.name} from ${folderName}/${file}`);
      } catch (e) {
        console.log(`[AUTO-FIX] Skip ${file}: ${e.message}`);
      }
    }
  }
  return count;
}

export async function loadCommands() {
  try {
    const router = await load(true);
    const autoCount = await loadAutoCommands();
    const total = typeof router.totalCommands === 'function' ? router.totalCommands() : 0;
    const finalTotal = total + autoCount;
    console.log(`COMMANDS LOADED: ${total} (main) + ${autoCount} (auto) = ${finalTotal} TOTAL - ALL WORKING`);
    return finalTotal;
  } catch (error) {
    console.error('Load Error:', error?.message || error);
    await loadAutoCommands();
    return autoCommands.size;
  }
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

    // AUTO COMMAND CHECK
    try {
      const text = message.message.conversation || message.message.extendedTextMessage?.text || "";
      if (text && /^[.!#]/.test(text)) {
        const args = text.slice(1).trim().split(/ +/);
        const cmdName = args.shift()?.toLowerCase();
        const actual = autoAliases.get(cmdName) || cmdName;
        const autoCmd = autoCommands.get(actual);
        if (autoCmd) {
          await autoCmd.execute(sock, message, args, { commands: autoCommands });
          continue; // auto command mil gaya to main wala skip
        }
      }
    } catch {}

    try { await router.handleMessage(sock, message); } catch (error) { console.error('onMessage error:', error?.message || error); }
  }
}

export async function onMessagesUpdate(sock, updates) {
  for (const item of updates || []) {
    const update = item?.update || item;
    const protocol = update?.message?.protocolMessage;
    if (protocol?.type === 0 && protocol?.key) await restoreDeletedMessage(sock, protocol);
  }
}