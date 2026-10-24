// SHADOW MD MINI - handler.js (ESM)
// 1) Built-in commands (commands.js): menu with picture, ping, alive, group, owner...
// 2) Your own plugins: put files in /plugins with
//    export default { command: ['name','alias'], run: async (sock, m, { args, text, command, config, isOwner, reply }) => {} }
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { handleMessage as builtIn, hasCommand, settings } from './commands.js';

export { sendPic } from './commands.js';

let config = {};
try { config = (await import('./config.js')).default ?? {}; } catch { /* config.js optional */ }
if (config.prefix) settings.prefix = config.prefix;

const PLUGIN_DIR = path.join(process.cwd(), 'plugins');
let plugins = new Map();
let loadedStamp = -1;

async function loadPlugins() {
  let stamp = 0;
  try { stamp = fs.statSync(PLUGIN_DIR).mtimeMs; } catch { plugins = new Map(); loadedStamp = -1; return; }
  if (stamp === loadedStamp) return;
  const next = new Map();
  for (const file of fs.readdirSync(PLUGIN_DIR).filter((f) => f.endsWith('.js'))) {
    try {
      const mod = await import(pathToFileURL(path.join(PLUGIN_DIR, file)).href + `?v=${stamp}`);
      const p = mod.default;
      const run = p?.run ?? p?.execute;
      if (!p || !p.command || typeof run !== 'function') continue;
      for (const c of [].concat(p.command)) next.set(String(c).toLowerCase(), { ...p, run, file });
    } catch (e) {
      console.log(`plugin ${file} failed to load:`, e.message);
    }
  }
  plugins = next;
  loadedStamp = stamp;
  console.log(`Plugins loaded: ${plugins.size} commands`);
}

export default async function handleMessage(sock, m) {
  try {
    if (!m?.message || !m.key?.remoteJid || m.key.remoteJid === 'status@broadcast') return;

    const msg = m.message.ephemeralMessage?.message || m.message.viewOnceMessage?.message || m.message;
    const body = (msg.conversation || msg.extendedTextMessage?.text || msg.imageMessage?.caption || msg.videoMessage?.caption || '').trim();
    if (!body.startsWith(settings.prefix)) return;

    const args = body.slice(settings.prefix.length).trim().split(/\s+/);
    const command = (args.shift() || '').toLowerCase();
    if (!command) return;

    // Built-in commands first (so .menu always shows the picture)
    if (hasCommand(command)) return await builtIn(sock, m);

    // Then your plugins
    await loadPlugins();
    const plugin = plugins.get(command);
    if (!plugin) return;

    const sender = (m.key.fromMe ? sock.user.id : (m.key.participant || m.key.remoteJid)).split(':')[0].split('@')[0];
    const isOwner = !!m.key.fromMe || (process.env.OWNER_NUMBER || '').split(',').map((x) => x.trim()).includes(sender);
    if (settings.mode === 'private' && !isOwner) return;

    const reply = (t) => sock.sendMessage(m.key.remoteJid, { text: String(t) }, { quoted: m });
    try {
      await plugin.run(sock, m, { args, text: args.join(' '), command, config, isOwner, reply, prefix: settings.prefix });
    } catch (e) {
      console.log(`plugin ${plugin.file} error:`, e);
      await reply('⚠ Command failed. Try again.').catch(() => {});
    }
  } catch (e) {
    console.log('Handler Error:', e);
  }
}