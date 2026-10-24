import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { jidNormalizedUser } from '@whiskeysockets/baileys';
import config from './config.js';
import store from './lib/store.js';
import * as U from './lib/utils.js';
import { preProcess } from './plugins/features.js';
import { onGroupUpdate } from './plugins/groups.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = new Map();
export const commandList = [];

export async function loadCommands() {
  commands.clear();
  commandList.length = 0;
  const dirs = ['commands', 'plugins'];
  
  for (const d of dirs) {
    const dir = path.join(__dirname, d);
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.js'));
    
    for (const f of files) {
      try {
        if (f === 'features.js' || f === 'groups.js') continue; // ye command nahi hain
        const mod = await import(pathToFileURL(path.join(dir, f)).href + `?v=${Date.now()}`);
        const c = mod.default || mod;
        if (!c || !c.name) continue;
        commands.set(c.name.toLowerCase(), c);
        if (c.alias) {
          for (const a of c.alias) commands.set(a.toLowerCase(), c);
        }
        commandList.push(c);
      } catch (e) {
        console.log(`[Command Load Fail] ${f}:`, e.message);
      }
    }
  }
  console.log(`✅ ${commandList.length} commands loaded`);
}

export async function onMessage(sock, m) {
  try {
    const msg = m.messages?.[0];
    if (!msg || !msg.message) return;
    
    // Status aur apne message ignore
    if (msg.key.remoteJid === 'status@broadcast') return;
    
    // PreProcess (anti-viewonce, antidelete, autoreact etc)
    if (await preProcess(sock, msg)) {
      // agar viewonce tha to yahan se aage nahi jana
    }

    const fromMe = msg.key.fromMe;
    const remoteJid = msg.key.remoteJid;
    const isGroup = remoteJid.endsWith('@g.us');
    const sender = jidNormalizedUser(fromMe ? sock.user.id : (msg.key.participant || remoteJid));
    const botId = jidNormalizedUser(sock.user.id);
    
    const inner = U.unwrap(msg.message);
    if (!inner) return;
    
    const body = U.textOf(inner);
    if (!body) return;

    // Banned check
    const banned = store.get('banned') || [];
    if (banned.includes(sender)) return;

    const prefix = store.get('prefix') || '.';
    const isOwner = fromMe || sender === jidNormalizedUser(config.ownerNumber + '@s.whatsapp.net') || (store.get('sudo') || []).includes(sender);
    
    // Private mode check
    const mode = store.get('mode') || 'public';
    if (mode === 'private' && !isOwner) return;
    if (mode === 'self' && !fromMe) return;

    if (!body.startsWith(prefix)) return;

    const args = body.slice(prefix.length).trim().split(/ +/);
    const cmdName = args.shift().toLowerCase();
    const cmd = commands.get(cmdName);
    if (!cmd) return;

    // Owner only
    if (cmd.owner && !isOwner) {
      return sock.sendMessage(remoteJid, { text: '❌ Ye command sirf owner ke liye hai.' }, { quoted: msg });
    }
    // Group only
    if (cmd.group && !isGroup) {
      return sock.sendMessage(remoteJid, { text: '❌ Ye command sirf group mein chalti hai.' }, { quoted: msg });
    }
    // Admin only
    if (cmd.admin || cmd.botAdmin) {
      if (isGroup) {
        const meta = await U.getMeta(sock, remoteJid).catch(() => null);
        const admins = meta ? meta.participants.filter(p => p.admin).map(p => jidNormalizedUser(p.id)) : [];
        const isAdmin = admins.includes(sender);
        const isBotAdmin = admins.includes(botId);
        if (cmd.admin && !isAdmin && !isOwner) {
          return sock.sendMessage(remoteJid, { text: '❌ Pehle group admin bano.' }, { quoted: msg });
        }
        if (cmd.botAdmin && !isBotAdmin) {
          return sock.sendMessage(remoteJid, { text: '❌ Pehle bot ko group admin banao.' }, { quoted: msg });
        }
      }
    }

    const input = args.join(' ');
    const reply = (text, extra = {}) => sock.sendMessage(remoteJid, { text, ...extra }, { quoted: msg });
    const quoted = U.getQuoted(msg);
    const qtext = U.textOf(quoted);

    // Usage check
    if (cmd.need && !input && !qtext) {
      return reply(`Use: *${prefix}${cmd.usage || cmd.name}*`);
    }

    console.log(`[CMD] ${cmdName} from ${sender} in ${isGroup ? remoteJid : 'private'}`);

    await cmd.run({
      sock,
      msg,
      from: remoteJid,
      sender,
      args,
      input,
      reply,
      isOwner,
      isGroup,
      isAdmin: true,
      isBotAdmin: true,
      botId,
      commands: commandList,
      prefix,
      quoted,
      qtext
    });

  } catch (e) {
    console.error(`[onMessage Error]`, e);
  }
}

export { onGroupUpdate };