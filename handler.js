import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import config from './config.js';
import store from './lib/store.js';
import * as U from './lib/utils.js';
import { preProcess } from './plugins/features.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'commands');
export const commands = new Map();
export const commandList = [];

export async function loadCommands() {
  commands.clear();
  commandList.length = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    try {
      const mod = await import(pathToFileURL(path.join(dir, f)).href);
      let c = mod.default || mod.command || mod;
      if (typeof c === 'function') c = { run: c };
      const run = c.run || c.execute || c.handler || c.exec;
      if (typeof run !== 'function') { console.warn('⚠️ skip (run function nahi mila):', f); continue; }
      c = { ...c, run, name: String(c.name || f.slice(0, -3)).toLowerCase() };
      const aliases = [].concat(c.aliases || c.alias || []).map((a) => String(a).toLowerCase());
      commandList.push(c);
      commands.set(c.name, c);
      aliases.forEach((a) => commands.set(a, c));
    } catch (e) { console.error('❌ Command load fail:', f, '-', e.message); }
  }
  console.log(`✅ ${commandList.length} commands loaded`);
}

export async function onMessage(sock, m) {
  if (!m.message || !m.key?.remoteJid) return;
  const jid = m.key.remoteJid;
  const fromMe = !!m.key.fromMe;
  const isGroup = jid.endsWith('@g.us');
  const botId = jidNormalizedUser(sock.user.id);
  const sender = jidNormalizedUser(fromMe ? botId : (m.key.participant || jid));
  const inner = U.unwrap(m.message);
  const body = U.textOf(inner);
  const prefix = store.get('prefix');
  const sn = U.num(sender);
  const isOwner = fromMe || sn === config.ownerNumber || sn === config.botNumber || (store.get('sudo') || []).includes(sn);

  if (!isOwner && (store.get('banned') || []).includes(sn)) return;

  const base = { sock, m, jid, fromMe, isGroup, sender, inner, body, prefix, isOwner, botId };
  if (await preProcess(sock, m, base)) return;
  if (!body || !body.startsWith(prefix)) return;

  const [name, ...args] = body.slice(prefix.length).trim().split(/\s+/);
  const cmd = commands.get((name || '').toLowerCase());
  if (!cmd) return;
  if (store.get('mode') === 'private' && !isOwner) return;

  const reply = (text, extra = {}) => sock.sendMessage(jid, { text, ...extra }, { quoted: m });
  try {
    if (cmd.owner && !isOwner) return reply('👑 Ye command sirf owner ke liye hai.');
    if (cmd.group && !isGroup) return reply('👥 Ye command sirf group mein chalti hai.');

    let isAdmin = false, isBotAdmin = false;
    if (isGroup && (cmd.admin || cmd.botAdmin)) {
      const admins = U.adminsOf(await U.getMeta(sock, jid));
      isAdmin = admins.includes(sender);
      isBotAdmin = admins.includes(botId);
      if (cmd.admin && !isAdmin && !isOwner) return reply('🛡️ Sirf group admin ye command use kar sakta hai.');
      if (cmd.botAdmin && !isBotAdmin) return reply('🤖 Pehle bot ko group admin banao.');
    }

    const quoted = U.getQuoted(m);
    const text = args.join(' ');
    const input = text || U.textOf(quoted?.message);
    if (cmd.need && !input) return reply(`📌 Use: *${prefix}${cmd.usage || cmd.name}*`);

    await cmd.run({
      sock, m, jid, sender, args, text, input, reply, isOwner, isGroup, isAdmin, isBotAdmin,
      prefix, quoted, botId, commands, commandList, getMeta: () => U.getMeta(sock, jid),
    });
  } catch (e) {
    console.error(`[${cmd.name}]`, e);
    reply(`❌ ${cmd.name}: ${e.message || 'kuch masla aa gaya'}`).catch(() => {});
  }
}
