// commands.js - ROOT ROUTER
// Ye file khud koi command nahi rakhti. commands/ folder ki har file ek command (ya kuch commands) hoti hai,
// yahan unhe naam se register karke message aane par naam dekh kar sahi file chalayi jati hai.

// Command file ka format:   export const command = { name, aliases?, category?, owner?, group?, run: async (ctx) => {} }
// (ek file mein kai commands ho to:  export const commands = [ {...}, {...} ])
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as baileys from '@whiskeysockets/baileys';
import { settings } from './lib/shared.js';
import { CommandError } from './lib/command-utils.js';

const B = (k) => baileys[k] ?? baileys.default?.[k];
const jidNormalizedUser = B('jidNormalizedUser') ?? ((j) => (j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent');

export { settings };

const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'commands');
const OWNER_VV_KEYWORDS = ['subhanallah', 'mashaallah', 'mashallah'];
const CAT = { MAIN: 'general', UTILITY: 'general' }; // baaki categories jaisi hain waisi (lowercase)

export let commands = new Map(); // naam/alias -> command
export let commandsList = [];    // sirf asli commands (menu ke liye)

/* ---------------- commands/ folder load ---------------- */
export async function loadCommands(bust = false) {
  const stamp = bust ? '?v=' + Date.now() : '';
  const map = new Map();
  const list = [];
  const files = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).sort() : [];
  const aliasMaps = [];
  const pending = [];
  let failed = 0;

  for (const f of files) {
    try {
      const mod = await import(pathToFileURL(path.join(DIR, f)).href + stamp);
      if (mod.aliases && typeof mod.aliases === 'object') aliasMaps.push(mod.aliases);
      const defs = [mod.command, ...(Array.isArray(mod.commands) ? mod.commands : [])].filter(Boolean);
      for (const d of defs) {
        if (typeof d.name !== 'string' || typeof d.run !== 'function' || d.hidden) continue;
        const name = d.name.toLowerCase();
        const cat = String(d.category || 'general');
        const entry = {
          name,
          cat: CAT[cat.toUpperCase()] || cat.toLowerCase(),
          owner: !!d.owner,
          group: !!d.group,
          desc: d.description || '',
          file: f,
          run: d.run
        };
        if (map.has(name)) console.log(`WARNING: "${name}" do files mein hai (${map.get(name).file} aur ${f}), ${f} wali chalegi`);
        map.set(name, entry);
        const i = list.findIndex((x) => x.name === name);
        if (i >= 0) list[i] = entry; else list.push(entry);
        for (const a of d.aliases || d.alias || []) pending.push([String(a).toLowerCase(), name]);
      }
    } catch (e) {
      failed++;
      console.log(`LOAD FAIL commands/${f}:`, e.message);
    }
  }

  // aliases sirf tab lagti hain jab naam khali ho, is se koi asli command kabhi dab nahi sakti
  for (const [a, target] of pending) if (!map.has(a)) map.set(a, map.get(target));
  for (const am of aliasMaps) for (const [a, target] of Object.entries(am)) if (!map.has(a) && map.has(target)) map.set(a, map.get(target));

  commands = map;
  commandsList.length = 0;
  commandsList.push(...list);
  console.log(`COMMANDS LOADED: ${list.length} commands, ${files.length} files${failed ? ', ' + failed + ' FAIL' : ''}`);
  return list.length;
}

export const totalCommands = () => commandsList.length;
await loadCommands();

/* ---------------- message handler ---------------- */
export async function handleMessage(sock, m) {
  const jid = m.key?.remoteJid; if (!jid || !m.message) return;
  const content = normalizeMessageContent ? normalizeMessageContent(m.message) : m.message;
  let text = (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || '').trim();
  if (!text) return;

  const senderJid = jidNormalizedUser(m.key.participant || jid);
  const senderNum = senderJid.split('@')[0];
  const myNum = jidNormalizedUser(sock.user.id).split('@')[0];
  const ownerNums = (process.env.OWNER_NUMBER || settings.ownerNumber).split(',').map((x) => x.trim());
  const isOwner = m.key.fromMe || ownerNums.includes(senderNum) || senderNum === settings.ownerNumber || senderNum === myNum;

  // owner "subhanallah / mashaallah" likhe to view-once reply khul jata hai
  const lower = text.toLowerCase();
  if (isOwner && OWNER_VV_KEYWORDS.includes(lower)) {
    const q = content?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (q) {
      const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessageV2Extension?.message || q;
      const inner = Object.values(vo)[0] || vo;
      if (inner?.imageMessage) { await sock.sendMessage(jid, { image: inner.imageMessage, caption: lower.toUpperCase() }, { quoted: m }).catch(() => {}); return; }
      if (inner?.videoMessage) { await sock.sendMessage(jid, { video: inner.videoMessage }, { quoted: m }).catch(() => {}); return; }
      if (inner?.audioMessage) { await sock.sendMessage(jid, { audio: inner.audioMessage, ptt: true }, { quoted: m }).catch(() => {}); return; }
    }
  }

  // command ka naam dekho
  if (!text.startsWith(settings.prefix)) return;
  const [rawName, ...args] = text.slice(settings.prefix.length).trim().split(/\s+/);
  const cmd = commands.get(rawName.toLowerCase());
  if (!cmd) return;
  if (settings.mode === 'private' && !isOwner) return;
  if (cmd.owner && !isOwner) return sock.sendMessage(jid, { text: 'ONLY OWNER' }, { quoted: m }).catch(() => {});

  const isGroup = jid.endsWith('@g.us');
  const reply = (t) => sock.sendMessage(jid, { text: String(t) }, { quoted: m }).catch(() => sock.sendMessage(jid, { text: String(t) }));
  if (cmd.group && !isGroup) return reply('❌ Ye command sirf group mein chalti hai.');

  let metaCache = null;
  const getMeta = async () => (metaCache ||= isGroup ? await sock.groupMetadata(jid) : null);
  const info = content?.extendedTextMessage?.contextInfo || {};
  let targets = info.mentionedJid?.length ? info.mentionedJid : info.participant ? [info.participant] : [];
  if (!targets.length) targets = args.map((a) => a.replace(/\D/g, '')).filter((a) => a.length >= 8).map((n) => n + '@s.whatsapp.net');

  // ctx: purani commands (c.m, c.jid ...) aur folder wali commands (ctx.msg, ctx.remote ...) dono ke naam maujood hain
  const c = {
    sock, m, jid, args, text: args.join(' '), isGroup, isOwner, reply, getMeta, targets, content, prefix: settings.prefix,
    msg: m, remote: jid, sender: senderNum, senderNum, senderJid,
    settings, commandList: commandsList, reload: () => loadCommands(true)
  };
  try {
    await cmd.run(c);
  } catch (e) {
    if (e instanceof CommandError) return reply(e.message);
    console.log('CMD ERR (' + cmd.name + '):', e.message);
  }
}

export default handleMessage;