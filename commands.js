// commands.js — AUTO COMMAND LOADER

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as baileys from '@whiskeysockets/baileys';
import { settings } from './lib/shared.js';
import { CommandError } from './lib/command-utils.js';

const B = (k) => baileys[k] ?? baileys.default?.[k];
const jidNormalizedUser =
  B('jidNormalizedUser') ?? ((j) => (j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent');

export { settings };

const DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'commands'
);

export let commands = new Map();
export let commandsList = [];

export async function loadCommands(bust = false) {
  const map = new Map();
  const list = [];
  const pending = [];
  const aliasMaps = [];

  const files = fs.existsSync(DIR)
    ? fs.readdirSync(DIR).filter((f) => f.endsWith('.js')).sort()
    : [];

  for (const f of files) {
    try {
      const url = pathToFileURL(path.join(DIR, f));
      if (bust) url.searchParams.set('v', Date.now());

      const mod = await import(url.href);

      if (mod.aliases && typeof mod.aliases === 'object') {
        aliasMaps.push(mod.aliases);
      }

      const defs = [
        mod.command,
        mod.default,
        ...(Array.isArray(mod.commands) ? mod.commands : [])
      ].filter((d) => d && typeof d === 'object');

      for (const d of defs) {
        if (
          typeof d.name !== 'string' ||
          typeof d.run !== 'function' ||
          d.hidden
        ) continue;

        const name = d.name.toLowerCase();

        const entry = {
          name,
          cat: String(d.category || 'general').toLowerCase(),
          owner:
            !!d.owner ||
            String(d.category || '').toLowerCase() === 'owner',
          group: !!d.group,
          desc: d.description || '',
          file: f,
          run: d.run
        };

        map.set(name, entry);

        const index = list.findIndex((x) => x.name === name);
        if (index >= 0) list[index] = entry;
        else list.push(entry);

        for (const a of d.aliases || d.alias || []) {
          pending.push([String(a).toLowerCase(), name]);
        }
      }
    } catch (e) {
      console.error(`LOAD FAIL commands/${f}:`, e.message);
    }
  }

  for (const [alias, target] of pending) {
    if (!map.has(alias) && map.has(target)) {
      map.set(alias, map.get(target));
    }
  }

  for (const aliases of aliasMaps) {
    for (const [alias, target] of Object.entries(aliases)) {
      if (!map.has(alias) && map.has(target)) {
        map.set(alias, map.get(target));
      }
    }
  }

  commands = map;
  commandsList.length = 0;
  commandsList.push(...list);

  console.log(`COMMANDS LOADED: ${list.length} commands, ${files.length} files`);

  return list.length;
}

export const totalCommands = () => commandsList.length;

await loadCommands();

// Automatically reload commands when files are added or changed.
let reloadTimer;

if (fs.existsSync(DIR)) {
  fs.watch(DIR, (_event, filename) => {
    if (filename && !String(filename).endsWith('.js')) return;

    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      loadCommands(true).catch(console.error);
    }, 500);
  });
}

// MESSAGE HANDLER
export async function handleMessage(sock, m) {
  const jid = m.key?.remoteJid;
  if (!jid || !m.message) return;

  const content = normalizeMessageContent
    ? normalizeMessageContent(m.message)
    : m.message;

  const text = (
    content?.conversation ||
    content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption ||
    content?.videoMessage?.caption ||
    ''
  ).trim();

  if (!text || !text.startsWith(settings.prefix)) return;

  const commandText = text.slice(settings.prefix.length).trim();
  if (!commandText) return;

  const [rawName, ...args] = commandText.split(/\s+/);

  const senderJid = jidNormalizedUser(m.key.participant || jid);
  const senderNum = senderJid.split('@')[0];
  const myNum = jidNormalizedUser(sock.user?.id || '').split('@')[0];

  const ownerNums = String(process.env.OWNER_NUMBER || settings.ownerNumber || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  const isOwner =
    m.key.fromMe ||
    ownerNums.includes(senderNum) ||
    senderNum === String(settings.ownerNumber || '') ||
    senderNum === myNum;

  const cmd = commands.get(rawName.toLowerCase());
  if (!cmd) return;

  if (settings.mode === 'private' && !isOwner) return;

  const reply = (message) =>
    sock.sendMessage(
      jid,
      { text: String(message) },
      { quoted: m }
    ).catch(() => {});

  if (cmd.owner && !isOwner) return reply('ONLY OWNER');

  const isGroup = jid.endsWith('@g.us');
  if (cmd.group && !isGroup) {
    return reply('❌ Ye command sirf group mein chalti hai.');
  }

  const info = content?.extendedTextMessage?.contextInfo || {};
  let targets = info.mentionedJid?.length
    ? info.mentionedJid
    : info.participant
      ? [info.participant]
      : [];

  if (!targets.length) {
    targets = args
      .map((a) => a.replace(/\D/g, ''))
      .filter((n) => n.length >= 8)
      .map((n) => n + '@s.whatsapp.net');
  }

  let metaCache = null;

  const getMeta = async () =>
    (metaCache ||= isGroup ? await sock.groupMetadata(jid) : null);

  const ctx = {
    sock,
    m,
    jid,
    args,
    text: args.join(' '),
    isGroup,
    isOwner,
    reply,
    getMeta,
    targets,
    content,
    prefix: settings.prefix,
    msg: m,
    remote: jid,
    sender: senderNum,
    senderNum,
    senderJid,
    settings,
    commandList: commandsList,
    reload: () => loadCommands(true)
  };

  try {
    await cmd.run(ctx);
  } catch (e) {
    if (e instanceof CommandError) return reply(e.message);
    console.error(`CMD ERR (${cmd.name}):`, e);
    return reply('❌ Command mein error aaya.');
  }
}

export default handleMessage;