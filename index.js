// SHADOW MD MINI - index.js
// Web server (Render/Railway) + /api/commands + WhatsApp pairing + the bot itself.
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import pino from 'pino';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let AUTH_DIR = path.resolve(process.env.AUTH_DIR || './auth');
const PORT = process.env.PORT || 10000;
let core, config, commands, listCommands, loadErrors, rememberMessage, getStoredMessage, handleRevoke, handleMessage;
const logger = pino({ level: 'silent' });
// Loads Baileys in a way that works for both the CommonJS (6.x) and ESM (7.x) builds.
let baileysCache;
async function loadBaileys() {
  if (baileysCache) return baileysCache;
  const ns = await import('@whiskeysockets/baileys');
  const d = ns.default;
  const pick = (k) => ns[k] ?? d?.[k];
  baileysCache = {
    makeWASocket: typeof d === 'function' ? d : (d?.default ?? ns.makeWASocket),
    useMultiFileAuthState: pick('useMultiFileAuthState'),
    makeCacheableSignalKeyStore: pick('makeCacheableSignalKeyStore'),
    fetchLatestBaileysVersion: pick('fetchLatestBaileysVersion'),
    Browsers: pick('Browsers'),
    DisconnectReason: pick('DisconnectReason'),
  };
  if (typeof baileysCache.makeWASocket !== 'function') throw new Error('Baileys makeWASocket not found - run npm install');
  return baileysCache;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

process.on('unhandledRejection', (e) => console.log('unhandledRejection:', e?.message || e));
process.on('uncaughtException', (e) => console.log('uncaughtException:', e?.message || e));

console.log('Starting bot...');
console.log('Node.js', process.version);

// ------------------------------------------------------------------ web server
const app = express();
app.use(express.json());

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/health', (req, res) => res.send('OK'));

app.use('/api', (req, res, next) => (core ? next() : res.status(503).json({ error: 'Bot is starting, try again in a few seconds' })));

// Every command, for the website (index.html)
app.get('/api/commands', (req, res) => {
  const list = listCommands(config.prefix);
  res.json({
    bot: config.botName,
    prefix: config.prefix,
    total: list.length,
    categories: [...new Set(list.map((c) => c.category))],
    commands: list,
    errors: loadErrors,
  });
});

app.get('/api/status', (req, res) => {
  res.json({ ...status, bot: config.botName, owner: config.ownerName, mode: config.mode, prefix: config.prefix, commands: commands.size });
});

const lastPair = new Map();
async function pairHandler(req, res) {
  const number = String(req.query.number || req.body?.number || '').replace(/\D/g, '');
  if (number.length < 10) return res.status(400).json({ error: 'Number galat hai. Country code ke saath likho, e.g. 923001234567' });
  const last = lastPair.get(number) || 0;
  if (Date.now() - last < 10000) return res.status(429).json({ error: 'Thora ruko, 10 second baad dobara try karo' });
  lastPair.set(number, Date.now());
  try {
    const code = await requestPairingCode(number);
    res.json({ code });
  } catch (e) {
    console.log('Pair error:', e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
}
app.get('/api/pair', pairHandler);
app.post('/api/pair', pairHandler);

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// listen first, so Render/Railway see the port immediately
app.listen(PORT, () => console.log(`Server running on ${PORT}`));


// ------------------------------------------------------------------ runtime setup
// index.js is the only file you need to replace: it generates its helper module at boot and loads the
// commands from /commands (adapting their imports), so lib/, plugins/, handler.js do not matter.
const CORE_SRC = `// AUTO-GENERATED at boot by index.js (helpers + command registry + message handler).
import fs from 'node:fs';
import path from 'node:path';
import * as cfgNs from "__CONFIG_URL__";

// ---- config: your config.js + safe defaults for anything it does not have ----
export const config = cfgNs.config || cfgNs.default || {};
const defaults = {
  botName: 'SHADOW MD', ownerName: 'RANA FURQAN', ownerNumber: '923003719761', prefix: '.', mode: 'public', version: '2.0.0',
  githubRepository: 'https://github.com/shadowmd2007/SHADOW-MD-MINI.git', channelName: '', channelLink: '', groupName: '', groupLink: '',
  imageUrl: 'https://i.imgur.com/8Km9tLL.jpeg', authDir: './auth', dataDir: './data',
  tenorKey: 'AIzaSyACvEq5cnT7AcHpDdj1ZRNr5zNnXZDEDZQ',
};
for (const [k, v] of Object.entries(defaults)) if (config[k] === undefined || config[k] === '') config[k] = v;
config.prefix = process.env.PREFIX || config.prefix;
config.mode = process.env.MODE || config.mode;
config.authDir = process.env.AUTH_DIR || config.authDir;
config.dataDir = process.env.DATA_DIR || config.dataDir;
config.tenorKey = process.env.TENOR_KEY || config.tenorKey;
config.picUrl = process.env.PIC_URL || config.picUrl || config.imageUrl;
config.owners = [config.ownerNumber, ...(process.env.OWNER_NUMBER || '').split(',')].map((x) => String(x || '').replace(/\\D/g, '')).filter(Boolean);


// Thrown by helpers; the handler shows e.message to the user (no stack trace, no "Something went wrong").
export class CommandError extends Error {}

export function reply(sock, remote, msg, text) {
  return sock.sendMessage(remote, { text: String(text) }, msg ? { quoted: msg } : undefined);
}

export const jidNumber = (jid = '') => String(jid).split('@')[0].split(':')[0];

export function formatDuration(totalSeconds) {
  const s = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60);
  return \`\${d}d \${h}h \${m}m \${s % 60}s\`;
}

export function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Karachi' }).format(date);
}

// Safe calculator: + - * / % ^ ( ) and decimals. No eval().
export function parseSimpleMath(input) {
  const src = String(input || '').replace(/×/g, '*').replace(/÷/g, '/').replace(/\\s+/g, '');
  if (!src) throw new Error('Usage: .calc 12*(3+4)');
  if (!/^[0-9+\\-*/%^().]+$/.test(src)) throw new Error('Only numbers and + - * / % ^ ( ) are allowed');
  let i = 0;
  const peek = () => src[i];
  const expr = () => {
    let v = term();
    while (peek() === '+' || peek() === '-') v = src[i++] === '+' ? v + term() : v - term();
    return v;
  };
  const term = () => {
    let v = power();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = src[i++];
      const r = power();
      if (op === '*') v *= r;
      else if (r === 0) throw new Error('Division by zero');
      else v = op === '/' ? v / r : v % r;
    }
    return v;
  };
  const power = () => {
    const base = unary();
    if (peek() === '^') { i++; return base ** power(); }
    return base;
  };
  const unary = () => {
    if (peek() === '-') { i++; return -unary(); }
    if (peek() === '+') { i++; return unary(); }
    return atom();
  };
  const atom = () => {
    if (peek() === '(') {
      i++;
      const v = expr();
      if (peek() !== ')') throw new Error('Missing )');
      i++;
      return v;
    }
    const m = /^\\d*\\.?\\d+|^\\d+\\.?/.exec(src.slice(i));
    if (!m) throw new Error('Invalid expression');
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const result = expr();
  if (i < src.length) throw new Error('Invalid expression');
  if (!Number.isFinite(result)) throw new Error('Result is not a finite number');
  return Number(result.toPrecision(12));
}

// ---- message helpers ----
export function unwrapMessage(message) {
  let m = message;
  for (let n = 0; n < 5 && m; n++) {
    const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m.viewOnceMessageV2?.message ||
      m.documentWithCaptionMessage?.message || m.editedMessage?.message?.protocolMessage?.editedMessage;
    if (!inner) break;
    m = inner;
  }
  return m || {};
}

export function getContextInfo(msg) {
  const content = unwrapMessage(msg?.message);
  for (const v of Object.values(content)) if (v && typeof v === 'object' && v.contextInfo) return v.contextInfo;
  return {};
}

// Mentioned users -> replied-to user -> numbers typed in the args
export function getTargetJids(msg, args = []) {
  const info = getContextInfo(msg);
  if (info.mentionedJid?.length) return [...new Set(info.mentionedJid)];
  if (info.participant) return [info.participant];
  return [...new Set(args.map((a) => a.replace(/\\D/g, '')).filter((n) => n.length >= 8 && n.length <= 15))]
    .map((n) => n + '@s.whatsapp.net');
}

// ---- group helpers ----
export async function groupMeta(ctx) {
  if (!ctx.isGroup) throw new CommandError('❌ This command works in groups only.');
  return (ctx._meta ||= await ctx.sock.groupMetadata(ctx.remote));
}

const idsOf = (p) => [p.id, p.lid, p.phoneNumber, p.jid].filter(Boolean).map(jidNumber);
const isAdminRole = (p) => p.admin === 'admin' || p.admin === 'superadmin';

export async function requireGroupAdmin(ctx) {
  if (ctx.isOwner) return;
  const meta = await groupMeta(ctx);
  const me = new Set([ctx.senderJid, ctx.senderAlt].filter(Boolean).map(jidNumber));
  const p = meta.participants.find((x) => idsOf(x).some((n) => me.has(n)));
  if (!p || !isAdminRole(p)) throw new CommandError('❌ Only group admins can use this command.');
}

export async function requireBotAdmin(ctx) {
  const meta = await groupMeta(ctx);
  const me = new Set([ctx.sock.user?.id, ctx.sock.user?.lid].filter(Boolean).map(jidNumber));
  const p = meta.participants.find((x) => idsOf(x).some((n) => me.has(n)));
  if (!p || !isAdminRole(p)) throw new CommandError('❌ Make the bot a group admin first.');
}

// ================= api helpers =================
// Tiny helper for calling free public APIs. Every call has a timeout so a slow API can never hang a command.
export async function getJSON(url, { timeout = 8000, headers } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'user-agent': 'SHADOW-MD-MINI', accept: 'application/json', ...headers } });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

// Try each loader in order, return the first non-empty string; otherwise use the fallback.
export async function firstOf(loaders, fallback) {
  for (const load of loaders) {
    try {
      const v = await load();
      if (v && String(v).trim()) return String(v).trim();
    } catch { /* try next API */ }
  }
  return typeof fallback === 'function' ? fallback() : fallback;
}

export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ================= message store + antidelete =================
// Small in-memory message store.
// 1) Baileys' getMessage() needs it: without it WhatsApp shows "Waiting for this message. This may take a while".
// 2) .antidelete uses it to bring back deleted messages.

const MAX = 3000;
const messages = new Map();

export function rememberMessage(m) {
  const id = m?.key?.id;
  if (!id || !m.message) return;
  const content = unwrapMessage(m.message);
  if (content.protocolMessage || content.senderKeyDistributionMessage && Object.keys(content).length === 1) return;
  messages.set(id, m);
  if (messages.size > MAX) messages.delete(messages.keys().next().value);
}

export const getStoredMessage = (key) => messages.get(key?.id);

// ---------- antidelete settings (persisted in DATA_DIR/antidelete.json) ----------
const file = path.join(config.dataDir, 'antidelete.json');
let settings = { all: false, chats: [] };
try { settings = { ...settings, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { /* first run */ }
const save = () => {
  try { fs.mkdirSync(config.dataDir, { recursive: true }); fs.writeFileSync(file, JSON.stringify(settings)); } catch { /* read-only disk */ }
};

export const antideleteState = (chat) => (settings.all ? 'all' : settings.chats.includes(chat) ? 'chat' : 'off');
export function setAntidelete(mode, chat) {
  if (mode === 'allon') { settings.all = true; }
  else if (mode === 'on') { if (!settings.chats.includes(chat)) settings.chats.push(chat); }
  else { settings.all = false; settings.chats = []; }
  save();
}

// Called for every incoming message; if it is a "delete for everyone", resend the original.
export async function handleRevoke(sock, m) {
  const content = unwrapMessage(m.message);
  const pm = content.protocolMessage;
  if (!pm || (pm.type !== 0 && pm.type !== 'REVOKE') || !pm.key?.id) return false;
  const chat = m.key.remoteJid;
  if (antideleteState(chat) === 'off') return true;
  const original = messages.get(pm.key.id);
  if (!original || original.key.fromMe) return true;
  const who = original.key.participant || original.key.remoteJid;
  try {
    await sock.sendMessage(chat, {
      text: \`🗑️ *ANTIDELETE*\\n@\${jidNumber(who)} deleted this message:\`,
      mentions: [who],
    });
    await sock.sendMessage(chat, { forward: original });
  } catch (e) {
    console.log('antidelete resend failed:', e.message);
  }
  return true;
}


// ================= command registry =================
const DESC = {
  echo:'Repeat your text.', coin:'Flip a coin.', pickup:'Send a pickup line.', rps:'Play rock paper scissors.', rate:'Rate anything out of 100.',
  random:'Random number: .random 100', genpass:'Generate a strong password.', uuid:'Generate a UUID.', base64e:'Encode text to Base64.',
  base64d:'Decode Base64 text.', title:'Convert text to Title Case.', mock:'MoCk tExT.', clap:'Put 👏 between words.', repeat:'Repeat text: .repeat 3 hi',
  link:'Get the group invite link.', block:'Block a user.', unblock:'Unblock a user.', furqan:'About the owner.', rana:'About the owner.',
};
export const commands = new Map(); // unique commands by main name (used by .menu)
const lookup = new Map();          // name + aliases -> command
export const loadErrors = [];

const register = (cmd) => {
  const name = String(cmd.name).toLowerCase();
  if (lookup.has(name)) return false;
  const c = { ...cmd, name, category: String(cmd.category || 'OTHER').toUpperCase(), aliases: [] };
  commands.set(name, c);
  lookup.set(name, c);
  for (const a of [].concat(cmd.aliases || cmd.alias || [])) {
    const k = String(a).toLowerCase();
    if (!lookup.has(k)) { lookup.set(k, c); c.aliases.push(k); }
  }
  return true;
};

function adaptLegacy(l) {
  return {
    name: l.name, aliases: l.alias || [], category: l.cat === 'general' ? 'MAIN' : l.cat,
    description: l.desc || DESC[l.name] || '', owner: l.owner, group: l.group, admin: l.admin,
    run: (ctx) => l.run({
      sock: ctx.sock, m: ctx.msg, jid: ctx.remote, args: ctx.args, text: ctx.text, isGroup: ctx.isGroup, isOwner: ctx.isOwner, sender: ctx.senderJid,
      reply: (t) => reply(ctx.sock, ctx.remote, ctx.msg, t), getMeta: () => groupMeta(ctx), targets: getTargetJids(ctx.msg, ctx.args),
    }),
  };
}

export async function loadCommands({ dir, legacyUrl }) {
  commands.clear(); lookup.clear(); loadErrors.length = 0;
  const aliasMap = { groupinfo: 'ginfo' };
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
    try {
      const mod = await import(new URL('file://' + path.resolve(dir, file).split(path.sep).join('/')).href);
      if (mod.aliases && typeof mod.aliases === 'object') Object.assign(aliasMap, mod.aliases);
      const cmd = mod.command || (mod.default && typeof mod.default.run === 'function' && mod.default.name ? mod.default : null);
      if (!cmd || cmd.hidden) continue;
      if (!cmd.name || typeof cmd.run !== 'function') throw new Error('export const command needs { name, run }');
      register(cmd);
    } catch (e) {
      loadErrors.push({ file, error: e.message });
      console.log(\`[commands] \${file} skipped: \${e.message}\`);
    }
  }
  if (legacyUrl) {
    try {
      const { legacyCommands } = await import(legacyUrl);
      for (const l of legacyCommands) {
        if (!register(adaptLegacy(l))) {
          const target = lookup.get(l.name);
          for (const a of l.alias || []) if (!lookup.has(a)) { lookup.set(a, target); target.aliases.push(a); }
        }
      }
    } catch (e) { loadErrors.push({ file: 'commands.js', error: e.message }); console.log('[commands] commands.js extras skipped:', e.message); }
  }
  for (const [alias, target] of Object.entries(aliasMap)) {
    const t = lookup.get(String(target).toLowerCase());
    if (t && !lookup.has(alias)) { lookup.set(alias, t); t.aliases.push(alias); }
  }
  console.log(\`[commands] loaded \${commands.size} commands (\${lookup.size} names incl. aliases)\`);
  return commands.size;
}

export const resolve = (name) => lookup.get(String(name || '').toLowerCase());

export function listCommands(prefix = '.') {
  return [...commands.values()]
    .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
    .map((c) => ({ name: c.name, command: prefix + c.name, aliases: c.aliases, category: c.category, description: c.description || '', ownerOnly: !!c.owner, groupOnly: !!c.group }));
}

// ================= message handler =================
// SHADOW MD MINI - handler.js
// Parses an incoming WhatsApp message, finds the command in /commands and runs it.

export async function handleMessage(sock, m) {
  try {
    const remote = m?.key?.remoteJid;
    if (!m?.message || !remote || remote === 'status@broadcast' || remote.endsWith('@newsletter')) return;

    const content = unwrapMessage(m.message);
    const body = (content.conversation || content.extendedTextMessage?.text || content.imageMessage?.caption ||
      content.videoMessage?.caption || '').trim();
    const prefix = config.prefix;
    if (!body.startsWith(prefix)) return;

    const args = body.slice(prefix.length).trim().split(/\\s+/).filter(Boolean);
    const name = (args.shift() || '').toLowerCase();
    const cmd = resolve(name);
    if (!cmd) return;

    const isGroup = remote.endsWith('@g.us');
    const senderJid = m.key.fromMe ? sock.user?.id : (m.key.participant || remote);
    const senderAlt = m.key.participantAlt || m.key.remoteJidAlt || '';
    const sender = jidNumber(senderJid);
    const isOwner = !!m.key.fromMe || config.owners.includes(sender) || (senderAlt && config.owners.includes(jidNumber(senderAlt)));
    if (config.mode === 'private' && !isOwner) return;

    const ctx = { sock, msg: m, remote, args, text: args.join(' '), command: name, prefix, sender, senderJid, senderAlt, isGroup, isOwner, config };

    try {
      if (cmd.owner && !isOwner) return await reply(sock, remote, m, '❌ Owner only command.');
      if (cmd.group && !isGroup) return await reply(sock, remote, m, '❌ This command works in groups only.');
      if (cmd.admin) await requireGroupAdmin(ctx);
      await cmd.run(ctx);
    } catch (e) {
      if (e instanceof CommandError) return await reply(sock, remote, m, e.message).catch(() => {});
      console.log(\`[\${cmd.name}] error:\`, e?.message || e);
      await reply(sock, remote, m, \`⚠️ .\${cmd.name} failed: \${e?.message || 'unknown error'}\`).catch(() => {});
    }
  } catch (e) {
    console.log('Handler Error:', e);
  }
}

`;
const OVERRIDES = {
  "joke": `import { reply } from "../lib/command-utils.js";
import { getJSON, firstOf, pick } from "../lib/command-utils.js";
const local = ["Why did the developer go broke? Because they used up all their cache.","I told my code I needed a break. It said: try-catch.","Why do programmers prefer dark mode? Because light attracts bugs.","My bot knows 100 jokes, but it still needs a better command parser."];
// APIs: official-joke-api.appspot.com, v2.jokeapi.dev (safe mode) -> local list if both are down
export const command = { name:"joke", category:"FUN", description:"Send a clean joke (online API).", run: async ({sock,remote,msg}) => {
  const text = await firstOf([
    async () => { const j = await getJSON("https://official-joke-api.appspot.com/random_joke"); return \`\${j.setup}\\n\\n👉 \${j.punchline}\`; },
    async () => { const j = await getJSON("https://v2.jokeapi.dev/joke/Any?safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit"); return j.joke || \`\${j.setup}\\n\\n👉 \${j.delivery}\`; },
  ], () => pick(local));
  return reply(sock,remote,msg,\`😂 *JOKE*\\n\${text}\`);
} };
`,
  "fact": `import { reply } from "../lib/command-utils.js";
import { getJSON, firstOf, pick } from "../lib/command-utils.js";
const local = ["Octopuses have three hearts.","A day on Venus is longer than its year.","Bananas are botanically berries.","Honey can remain edible for a very long time when properly stored.","The Eiffel Tower can grow slightly in hot weather."];
// APIs: uselessfacts.jsph.pl, catfact.ninja -> local list
export const command = { name:"fact", category:"FUN", description:"Send a random fact (online API).", run: async ({sock,remote,msg}) => {
  const text = await firstOf([
    async () => (await getJSON("https://uselessfacts.jsph.pl/api/v2/facts/random?language=en")).text,
    async () => (await getJSON("https://catfact.ninja/fact")).fact,
  ], () => pick(local));
  return reply(sock,remote,msg,\`🧠 *FACT*\\n\${text}\`);
} };
`,
  "quote": `import { reply } from "../lib/command-utils.js";
import { getJSON, firstOf, pick } from "../lib/command-utils.js";
const local = ["Discipline beats motivation when motivation fades.","Small progress is still progress.","Build quietly. Let results make the noise.","Consistency turns plans into results.","Your future self is built by today's actions."];
// APIs: zenquotes.io, dummyjson.com -> local list
export const command = { name:"quote", category:"FUN", description:"Get a motivational quote (online API).", run: async ({sock,remote,msg}) => {
  const text = await firstOf([
    async () => { const [q] = await getJSON("https://zenquotes.io/api/random"); return \`\${q.q}\\n— \${q.a}\`; },
    async () => { const q = await getJSON("https://dummyjson.com/quotes/random"); return \`\${q.quote}\\n— \${q.author}\`; },
  ], () => pick(local));
  return reply(sock,remote,msg,\`💬 \${text}\`);
} };
`,
  "truth": `import { reply } from "../lib/command-utils.js";
import { getJSON, firstOf, pick } from "../lib/command-utils.js";
const local = ["What goal are you avoiding right now?","What is one thing you want to improve this month?","Who inspires you the most?","What is a habit you want to build?"];
// API: api.truthordarebot.xyz (PG rating) -> local list
export const command = { name:"truth", category:"FUN", description:"Get a truth question (online API).", run: async ({sock,remote,msg}) => {
  const text = await firstOf([async () => (await getJSON("https://api.truthordarebot.xyz/v1/truth?rating=pg")).question], () => pick(local));
  return reply(sock,remote,msg,\`🎤 *TRUTH:* \${text}\`);
} };
`,
  "dare": `import { reply } from "../lib/command-utils.js";
import { getJSON, firstOf, pick } from "../lib/command-utils.js";
const local = ["Send a harmless funny sticker.","Change your status for 10 minutes.","Compliment the next person who messages you.","Tell the group your funniest clean joke."];
// API: api.truthordarebot.xyz (PG rating) -> local list
export const command = { name:"dare", category:"FUN", description:"Get a harmless dare (online API).", run: async ({sock,remote,msg}) => {
  const text = await firstOf([async () => (await getJSON("https://api.truthordarebot.xyz/v1/dare?rating=pg")).question], () => pick(local));
  return reply(sock,remote,msg,\`🎯 *DARE:* \${text}\`);
} };
`,
  "compliment": `import { reply } from "../lib/command-utils.js";
import { getJSON, firstOf, pick } from "../lib/command-utils.js";
const local = ["You have excellent energy.","You keep moving forward, and that matters.","Your consistency is your superpower.","You bring good vibes to the chat."];
// API: complimentr.com -> local list
export const command = { name:"compliment", category:"FUN", description:"Send a positive compliment (online API).", run: async ({sock,remote,msg,args}) => {
  const text = await firstOf([async () => (await getJSON("https://complimentr.com/api")).compliment], () => pick(local));
  return reply(sock,remote,msg,\`✨ \${args.join(" ")||"You"}: \${text.charAt(0).toUpperCase()+text.slice(1)}\`);
} };
`,
  "emojimix": `import { reply } from "../lib/command-utils.js";
import { getJSON } from "../lib/command-utils.js";
import { config } from "../config.js";
// API: Google Emoji Kitchen through the Tenor API (set TENOR_KEY on your host to use your own key)
const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
export const command = { name:"emojimix", category:"FUN", description:"Mix two emojis into one picture (online API).", run: async ({sock,remote,msg,args}) => {
  const emojis = [...seg.segment(args.join(""))].map(s=>s.segment).filter(s=>/\\p{Extended_Pictographic}/u.test(s));
  if (emojis.length<2) return reply(sock,remote,msg,"Usage: .emojimix ❤️ 🔥");
  const [a,b] = emojis;
  const url = \`https://tenor.googleapis.com/v2/featured?key=\${config.tenorKey}&contentfilter=high&media_filter=png_transparent&component=proactive&collection=emoji_kitchen_v5&q=\${encodeURIComponent(a+"_"+b)}\`;
  let image;
  try { image = (await getJSON(url)).results?.[0]?.url; }
  catch (e) { return reply(sock,remote,msg,"❌ Emoji API abhi available nahi, thori der baad try karo."); }
  if (!image) return reply(sock,remote,msg,\`❌ \${a} + \${b} ka mix available nahi hai. Koi aur emojis try karo.\`);
  return sock.sendMessage(remote,{ image:{ url:image }, caption:\`\${a} + \${b}\` },{ quoted:msg });
} };
`,
  "antidelete": `import { reply } from "../lib/command-utils.js";
import { antideleteState, setAntidelete } from "../lib/command-utils.js";
// Messages are kept in memory (lib/store.js) so a deleted message can be sent back.
export const command = { name:"antidelete", aliases:["ad"], category:"OWNER", description:"Bring back deleted messages: .antidelete on | allon | off", owner:true, run: async ({sock,remote,msg,args}) => {
  const mode = (args[0] || "").toLowerCase();
  if (!["on","allon","off"].includes(mode)) {
    const s = antideleteState(remote);
    return reply(sock,remote,msg,\`🗑️ *ANTIDELETE* — \${s==="all"?"ON (all chats)":s==="chat"?"ON (this chat)":"OFF"}\\n\\n.antidelete on — this chat\\n.antidelete allon — every chat\\n.antidelete off — disable\`);
  }
  setAntidelete(mode, remote);
  return reply(sock,remote,msg, mode==="off" ? "❌ *ANTIDELETE OFF*" : mode==="allon" ? "✅ *ANTIDELETE ON* — har jagah." : "✅ *ANTIDELETE ON* — is chat mein.");
} };
`,
  "menu": `import { config } from "../config.js";
import { reply } from "../lib/command-utils.js";
import { commands } from "../plugins/index.js";
import { formatDuration } from "../lib/command-utils.js";

const ORDER = ["MAIN","GROUP","OWNER","FUN","MATH","TOOLS","UTILITY"];

export function buildMenu() {
  const grouped = new Map(ORDER.map((c) => [c, []]));
  for (const c of commands.values()) {
    if (!grouped.has(c.category)) grouped.set(c.category, []);
    grouped.get(c.category).push(c);
  }
  let out = \`*┌───⭓ \${config.botName} ⭓───*\\n*│* 👑 *OWNER:* \${config.ownerName}\\n*│* 📱 *BAILEYS:* MULTI DEVICE\\n*│* ⚙️ *TYPE:* NODEJS\\n*│* 🔑 *PREFIX:* \${config.prefix}\\n*│* 🛡️ *MODE:* \${config.mode}\\n*│* 📦 *VERSION:* \${config.version}\\n*│* ⏱️ *UPTIME:* \${formatDuration(process.uptime())}\\n*│* 🧩 *COMMANDS:* \${commands.size}\\n*└───────────────────⭓*\\n\\n\`;
  for (const [cat, arr] of grouped) {
    if (!arr.length) continue;
    arr.sort((a, b) => a.name.localeCompare(b.name));
    out += \`*┌───⭓ \${cat.toLowerCase()} ⭓───*\\n\`;
    for (const c of arr) out += \`*│* ⬡ \${config.prefix}\${c.name}\\n\`;
    out += \`*└───────────────────⭓*\\n\\n\`;
  }
  return out.trim() + \`\\n\\n> Powered by \${config.botName}\`;
}

export const command = { name:"menu", aliases:["allmenu","mainmenu","commands","list"], category:"MAIN", description:"Show all commands.", run: async ({sock,remote,msg}) => {
  const text = buildMenu();
  try { return await sock.sendMessage(remote, { image: { url: config.imageUrl }, caption: text }, { quoted: msg }); }
  catch { return reply(sock, remote, msg, text); }
} };
`
};

async function prepareRuntime() {
  const RT = path.join(__dirname, '.runtime');
  fs.rmSync(RT, { recursive: true, force: true });
  fs.mkdirSync(path.join(RT, 'commands'), { recursive: true });

  const toUrl = (p) => pathToFileURL(p).href;
  const corePath = path.join(RT, 'core.js');
  fs.writeFileSync(corePath, CORE_SRC.replace('__CONFIG_URL__', toUrl(path.join(__dirname, 'config.js'))));
  const coreUrl = toUrl(corePath);

  // every helper import used by command files now points to the generated core.js
  const fix = (src) => src.replace(/from\s+(["'])\.\.\/(?:lib\/command-utils|lib\/api|lib\/store|config|plugins\/index)\.js\1/g, `from ${JSON.stringify(coreUrl)}`);

  const dir = path.join(__dirname, 'commands');
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    if (/\brequire\(/.test(src) && !/^\s*export\s/m.test(src)) continue; // old CommonJS leftovers (e.g. keepAlive.js)
    fs.writeFileSync(path.join(RT, 'commands', f), fix(src));
  }
  for (const [name, src] of Object.entries(OVERRIDES)) fs.writeFileSync(path.join(RT, 'commands', name + '.js'), fix(src));

  // extra built-in commands (rps, rate, genpass, uuid ...) from your commands.js
  let legacyUrl = null;
  try {
    let src = fs.readFileSync(path.join(__dirname, 'commands.js'), 'utf8');
    src = src.replace(/export const settings = \{[\s\S]*?\n\};/, `import { config as __cfg } from ${JSON.stringify(coreUrl)};\nexport const settings = __cfg;`);
    if (!/legacyCommands/.test(src)) src += '\nexport const legacyCommands = list;\n';
    fs.writeFileSync(path.join(RT, 'legacy.js'), src);
    legacyUrl = toUrl(path.join(RT, 'legacy.js'));
  } catch (e) { console.log('commands.js extras not available:', e.message); }

  core = await import(coreUrl);
  ({ config, commands, listCommands, loadErrors, rememberMessage, getStoredMessage, handleRevoke, handleMessage } = core);
  AUTH_DIR = path.resolve(config.authDir);
  await core.loadCommands({ dir: path.join(RT, 'commands'), legacyUrl });
}

// ------------------------------------------------------------------ WhatsApp
const status = { connection: 'close', registered: false, user: null, note: 'starting' };
let sock = null;
let starting = false;
let retry = 0;
let qrSeen = false;

// Optional: restore a saved session. Put the base64 of creds.json in SESSION_ID (with or without "SHADOW~").
function restoreSession() {
  const creds = path.join(AUTH_DIR, 'creds.json');
  if (!process.env.SESSION_ID || fs.existsSync(creds)) return;
  try {
    const data = Buffer.from(process.env.SESSION_ID.replace(/^SHADOW~/, ''), 'base64').toString();
    JSON.parse(data);
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    fs.writeFileSync(creds, data);
    console.log('Session restored from SESSION_ID');
  } catch (e) {
    console.log('SESSION_ID invalid:', e.message);
  }
}

function dropSocket() {
  const old = sock;
  sock = null;
  if (!old) return;
  try { old.ev.removeAllListeners(); } catch { /* ignore */ }
  try { old.end(undefined); } catch { /* ignore */ }
}

async function startBot() {
  if (starting) return;
  starting = true;
  try {
    dropSocket(); // never keep two sockets on the same session - that is what causes "Waiting for this message"
    const B = await loadBaileys();
    fs.mkdirSync(AUTH_DIR, { recursive: true });
    restoreSession();
    const { state, saveCreds } = await B.useMultiFileAuthState(AUTH_DIR);
    const { version } = await B.fetchLatestBaileysVersion().catch(() => ({}));
    status.registered = !!state.creds.registered;
    qrSeen = false;

    const s = B.makeWASocket({
      version,
      logger,
      auth: { creds: state.creds, keys: B.makeCacheableSignalKeyStore(state.keys, logger) },
      browser: B.Browsers.ubuntu('Chrome'),
      printQRInTerminal: false,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      // THE FIX for "Waiting for this message": when WhatsApp asks the bot to resend a message it could not decrypt,
      // Baileys needs getMessage() to return the original message.
      getMessage: async (key) => getStoredMessage(key)?.message,
    });
    sock = s;

    s.ev.on('creds.update', saveCreds);

    s.ev.on('connection.update', async (u) => {
      if (s !== sock) return;
      const { connection, lastDisconnect, qr } = u;
      if (qr) qrSeen = true;
      if (connection) status.connection = connection;

      if (connection === 'open') {
        retry = 0;
        status.registered = true;
        status.user = s.user?.id || null;
        status.note = 'connected';
        console.log('SHADOW-MD connected as', status.user, '| commands:', commands.size);
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;
        console.log('Connection closed, code:', code, lastDisconnect?.error?.message || '');
        status.user = null;
        if (code === B.DisconnectReason.loggedOut) {
          status.note = 'logged out - pair again';
          status.registered = false;
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
          await sleep(1000);
          return startBot();
        }
        if (code === B.DisconnectReason.connectionReplaced) {
          status.note = 'replaced by another instance of this bot (same session running twice)';
          console.log('Session is open somewhere else - not reconnecting. Stop the other instance and restart.');
          return;
        }
        status.note = 'reconnecting';
        const wait = code === B.DisconnectReason.restartRequired ? 500 : Math.min(30000, 2000 * 2 ** retry++);
        await sleep(wait);
        starting = false;
        return startBot();
      }
    });

    s.ev.on('messages.upsert', async ({ messages, type }) => {
      for (const m of messages) {
        try {
          rememberMessage(m);
          if (await handleRevoke(s, m)) continue;
          if (type !== 'notify') continue;
          let t = m.messageTimestamp;
          t = typeof t === 'object' && t ? (t.toNumber?.() ?? t.low) : Number(t);
          if (t && Date.now() / 1000 - t > 120) continue; // ignore old messages replayed after a reconnect
          if (m.key.fromMe && String(m.key.id).startsWith('BAE5')) continue; // the bot's own replies
          await handleMessage(s, m);
        } catch (e) {
          console.log('message error:', e?.message || e);
        }
      }
    });
  } catch (e) {
    console.log('startBot failed:', e.message);
    status.note = 'start failed: ' + e.message;
    setTimeout(startBot, 10000);
  } finally {
    starting = false;
  }
}

async function requestPairingCode(number) {
  if (status.registered && status.connection === 'open') {
    const err = new Error('Bot pehle se linked hai. Dobara pair karne ke liye WhatsApp > Linked devices se purani link hata do aur auth folder delete karo.');
    err.status = 409;
    throw err;
  }
  if (!sock) await startBot();
  // wait until WhatsApp is ready to accept a pairing request
  for (let i = 0; i < 40 && !qrSeen && status.connection !== 'open'; i++) await sleep(500);
  if (!sock) throw new Error('Bot start nahi hua, thori der baad try karo');
  if (sock.authState?.creds?.registered) {
    const err = new Error('Bot pehle se linked hai.');
    err.status = 409;
    throw err;
  }
  const raw = await sock.requestPairingCode(number);
  return raw?.match(/.{1,4}/g)?.join('-') || raw;
}

try {
  await prepareRuntime();
} catch (e) {
  console.log('Setup error:', e.message);
}
startBot();

// keeps the Render log alive
setInterval(() => console.log('Keep alive -', new Date().toISOString(), '| WA:', status.connection), 60000).unref?.();
