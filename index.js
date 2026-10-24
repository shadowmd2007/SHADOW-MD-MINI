import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import config from './config.js';
import store from './lib/store.js';
import * as U from './lib/utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const commands = new Map();
export const commandList = [];

export async function loadCommands() {
  commands.clear(); commandList.length = 0;
  const dir = path.join(__dirname, 'commands');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
  for (const f of files) {
    try {
      const mod = await import(pathToFileURL(path.join(dir, f)).href + `?v=${Date.now()}`);
      const c = mod.default || mod;
      if (!c?.name) continue;
      commands.set(c.name.toLowerCase(), c);
      if (c.alias) for (const a of c.alias) commands.set(a.toLowerCase(), c);
      commandList.push(c);
    } catch (e) { console.log(`Command fail ${f}:`, e.message); }
  }
  console.log(`✅ ${commandList.length} commands loaded`);
}

export async function onMessage(sock, m) {
  try {
    const msg = m.messages?.[0]; if (!msg?.message) return;
    if (msg.key.remoteJid === 'status@broadcast') return;
    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    const sender = jidNormalizedUser(msg.key.participant || remoteJid);
    const body = U.textOf(U.unwrap(msg.message)); if (!body) return;
    const prefix = store.get('prefix') || '.';
    if (!body.startsWith(prefix)) return;
    const args = body.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = commands.get(cmdName); if (!cmd) return;
    const isOwner = msg.key.fromMe || sender.includes(config.ownerNumber);
    if (cmd.owner && !isOwner) return;
    const reply = (t) => sock.sendMessage(remoteJid, { text: t }, { quoted: msg });
    await cmd.run({ sock, msg, from: remoteJid, sender, args, input: args.join(' '), reply, isOwner, isGroup, prefix, commands: commandList });
  } catch (e) { console.error('onMessage error:', e.message); }
}

export async function onGroupUpdate(sock, update) {
  // aapka group wala code yahan rahega
}