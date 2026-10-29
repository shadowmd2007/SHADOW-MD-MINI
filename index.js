import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { fileURLToPath, pathToFileURL } from 'node:url';
import baileys from '@whiskeysockets/baileys';
import { config } from './config.js';
import { CommandError } from './lib/command-utils.js';

const makeWASocket = baileys.default || baileys.makeWASocket;
const B = (k) => baileys[k] ?? baileys.default?.[k];
const { useMultiFileAuthState, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason, downloadMediaMessage } = baileys;
const jidNormalizedUser = B('jidNormalizedUser') ?? ((j) => String(j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent') ?? ((c) => c);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = Number(process.env.PORT || 3000);
const AUTH_DIR = path.resolve(__dirname, './auth');
const DATA_DIR = path.resolve(__dirname, './data');
const COMMANDS_DIR = path.join(__dirname, 'commands');
const ANTIDELETE_FILE = path.join(DATA_DIR, 'antidelete.json');
const ONLINE_FILE = path.join(DATA_DIR, 'online.json');
const logger = pino({ level: 'silent' });

let sock = null, status = 'DISCONNECTED', pairCode = null, pairTime = 0, lastNumber = '';
let reconnectTimer = null;
const messageStore = new Map();
const registry = new Map();      // command name / alias -> entry
const commandsMap = registry;    // used by the web page counter
let antiDeleteEnabled = false;
let alwaysOnline = true;
let onlineInterval = null;
const seenIds = new Set();
const seenDeletes = new Set();

try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
function readJson(file, fallbackFile) {
  for (const f of [file, fallbackFile]) {
    try { if (f && fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); } catch {}
  }
  return null;
}
{
  const a = readJson(ANTIDELETE_FILE, path.join(AUTH_DIR, 'antidelete.json'));
  if (a) antiDeleteEnabled = !!a.enabled;
  const o = readJson(ONLINE_FILE, path.join(AUTH_DIR, 'online.json'));
  if (o && typeof o.online === 'boolean') alwaysOnline = o.online;
}
function saveAntiDelete() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(ANTIDELETE_FILE, JSON.stringify({ enabled: antiDeleteEnabled, ownerJid: null })); } catch {} }
function saveOnline() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(ONLINE_FILE, JSON.stringify({ online: alwaysOnline })); } catch {} }

app.use(express.urlencoded({ extended: true })); app.use(express.json());
function cleanAuth() { try { if (fs.existsSync(AUTH_DIR)) fs.rmSync(AUTH_DIR, { recursive: true, force: true }); } catch {} try { fs.mkdirSync(AUTH_DIR, { recursive: true }); } catch {} }
function normNum(v) { let n = String(v || '').replace(/\D/g, ''); if (n.startsWith('0')) n = '92' + n.slice(1); return n; }
function getDP() { if (config.menuImage?.startsWith('http')) return config.menuImage; if (config.botImage?.startsWith('http')) return config.botImage; return 'https://i.ibb.co/BHfCmfbw/jawadmd.jpg'; }

// ================= COMMAND LOADER (supports every format in /commands) =================
const fileName = (f) => f.replace(/\.js$/, '').toLowerCase();

async function loadCommands() {
  registry.clear();
  const files = fs.existsSync(COMMANDS_DIR) ? fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js')).sort() : [];
  const entries = [];
  const aliasMaps = [];
  for (const f of files) {
    let mod;
    try { mod = await import(pathToFileURL(path.join(COMMANDS_DIR, f)).href); }
    catch (e) { console.log(`LOAD FAIL commands/${f}: ${e.message.split('\n')[0]}`); continue; }
    if (mod.aliases && typeof mod.aliases === 'object') aliasMaps.push(mod.aliases);

    const add = (kind, fn, names, d = {}) => {
      names = names.map((n) => String(n).toLowerCase()).filter(Boolean);
      if (!names.length || typeof fn !== 'function' || d.hidden) return;
      const cat = String(d.category || d.cat || 'general').toLowerCase();
      entries.push({ name: names[0], aliases: names.slice(1), kind, fn, file: f, cat,
        owner: !!d.owner || cat === 'owner', group: !!d.group });
    };
    const alist = (d) => [].concat(d?.aliases || d?.alias || []);

    // 1) export const command = { name, run(ctx) }
    if (mod.command && typeof mod.command === 'object' && typeof mod.command.run === 'function')
      add('ctx', mod.command.run, [mod.command.name || fileName(f), ...alist(mod.command)], mod.command);
    // 2) export const commands = [ {...}, {...} ]
    if (Array.isArray(mod.commands))
      for (const d of mod.commands) if (d && typeof d.run === 'function') add('ctx', d.run, [d.name || fileName(f), ...alist(d)], d);

    const d = mod.default;
    if (typeof d === 'function') {
      // 3) export default async (sock, m) => {}  (+ .command = [names], .execute)
      const names = Array.isArray(d.command) ? d.command : [d.command || d.name || fileName(f)];
      if (d.command && Array.isArray(d.command) && !d.command.includes(fileName(f))) names.unshift(fileName(f));
      add('exec', d.execute || d, names, d);
    } else if (d && typeof d === 'object') {
      if (typeof d.run === 'function' && !mod.command) add('ctx', d.run, [d.name || fileName(f), ...alist(d)], d);
      else if (typeof d.execute === 'function') add('exec', d.execute, [d.name || fileName(f), ...alist(d)], d); // 4) { name, execute(sock,m,args,extra) }
    }
    // 5) export function execute(...) + export const name
    if (typeof mod.execute === 'function' && !entries.some((e) => e.file === f))
      add('exec', mod.execute, [mod.name || fileName(f)], mod);
  }
  for (const e of entries) registry.set(e.name, e);                                   // real names first
  for (const e of entries) for (const a of e.aliases) if (!registry.has(a)) registry.set(a, e); // then aliases
  for (const map of aliasMaps) for (const [a, t] of Object.entries(map)) if (!registry.has(a) && registry.has(t)) registry.set(a, registry.get(t));
  console.log(`✅ ${new Set(entries.map((e) => e.name)).size} commands loaded (${registry.size} names incl. aliases)`);
}

function setOnlinePresence(wa, online) {
  try {
    if (onlineInterval) clearInterval(onlineInterval);
    onlineInterval = null;
    if (online) {
      wa.sendPresenceUpdate('available').catch(() => {});
      onlineInterval = setInterval(() => { try { wa.sendPresenceUpdate('available').catch(() => {}); } catch {} }, 25000);
    } else {
      wa.sendPresenceUpdate('unavailable').catch(() => {});
    }
  } catch {}
}

function html(){
  const valid=pairCode&&Date.now()-pairTime<65000; const DP=getDP();
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>RANA MD</title><style>body{margin:0;min-height:100vh;background:#000;display:flex;justify-content:center;align-items:center;color:#fff;padding:20px;font-family:Arial}.card{width:100%;max-width:430px;background:#111;border:2px solid #ff0040;border-radius:28px;padding:28px;text-align:center}.dp{width:130px;height:130px;border-radius:50%;border:3px solid #ff0040}.status{padding:7px 18px;border-radius:20px;font-weight:700;display:inline-block;margin:10px 0}.CONNECTED{background:#0f0;color:#000}.DISCONNECTED{background:#f00}input,button{width:100%;padding:14px;margin-top:12px;border-radius:14px}input{background:#000;color:#fff;border:1px solid #333;text-align:center}button{background:#ff0040;color:#fff;border:none;font-weight:700}.online{margin-top:10px;padding:8px;border-radius:10px;background:#222;font-size:13px}</style></head><body><div class="card"><img class="dp" src="${DP}"><h1>RANA FURQAN MD</h1><div style="color:#ff4d6d">🌹 Meri JAAN 🌹</div><div class="status ${status}">${status}</div><div class="online">Online: ${alwaysOnline?'🟢 ON':'⚫ OFF'} | Anti: ${antiDeleteEnabled?'ON':'OFF'} | ${commandsMap.size} Cmds</div>${status==='CONNECTED'?`<div style="color:#0f0;margin-top:10px">✅ BOT ONLINE</div>`:`<form method="post" action="/pair"><input name="num" value="${lastNumber}" placeholder="92300..." required><button>GET CODE</button></form>${valid?`<h1 style="color:#0f0;letter-spacing:5px">${pairCode}</h1>`:''}`}</div></body></html>`;
}
app.get('/',(req,res)=>res.send(html()));
app.get('/health', (req, res) => res.send('OK'));

// ================= HELPERS =================
const digits = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
function tsOf(m) { const t = m.messageTimestamp; if (!t) return 0; return typeof t === 'object' ? Number(t.toNumber?.() ?? t.low ?? 0) : Number(t); }
function ownJidOf(wa) { return jidNormalizedUser(wa.user?.id || ''); }
function ownerDigits(wa) {
  const s = new Set([digits(config.ownerNumber), digits(wa.user?.id), digits(wa.user?.lid)]);
  s.delete(''); return s;
}
function pruneStore() {
  if (messageStore.size <= 3000) return;
  const del = messageStore.size - 2500; let i = 0;
  for (const k of messageStore.keys()) { messageStore.delete(k); if (++i >= del) break; }
}
setInterval(() => {
  const cutoff = Date.now() - 2 * 3600 * 1000;
  for (const [k, v] of messageStore) if ((v.__t || 0) < cutoff) messageStore.delete(k);
  if (seenIds.size > 2000) seenIds.clear();
  if (seenDeletes.size > 2000) seenDeletes.clear();
}, 10 * 60 * 1000).unref?.();

function getText(content) {
  return (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption ||
    content?.videoMessage?.caption || content?.documentMessage?.caption || '').toString();
}

// ================= VIEW ONCE (.vv  .vv2  .vv3) =================
// .vv  -> opened media comes to YOUR personal chat only
// .vv2 / .vv3 -> opened media goes to the person who sent the view-once
async function openViewOnce(wa, m, ctx, toSender) {
  if (!ctx.isOwner) return ctx.reply('❌ This command is for the owner only.');
  const info = ctx.content?.extendedTextMessage?.contextInfo;
  if (!info?.quotedMessage) return ctx.reply(`❌ Reply to a view-once photo, video or voice note with ${ctx.prefix}${ctx.cmd}`);
  try {
    const stored = messageStore.get(info.stanzaId);
    let inner = normalizeMessageContent(stored?.message || info.quotedMessage) || {};
    if (inner.viewOnceMessage?.message) inner = inner.viewOnceMessage.message;
    if (inner.viewOnceMessageV2?.message) inner = inner.viewOnceMessageV2.message;
    if (inner.viewOnceMessageV2Extension?.message) inner = inner.viewOnceMessageV2Extension.message;
    const kind = inner.imageMessage ? 'image' : inner.videoMessage ? 'video' : inner.audioMessage ? 'audio' : null;
    if (!kind) return ctx.reply('❌ That is not a photo, video or voice note.');

    const buf = await downloadMediaMessage(
      { key: { remoteJid: ctx.jid, id: info.stanzaId, participant: info.participant }, message: inner },
      'buffer', {}, { logger, reuploadRequest: wa.updateMediaMessage });

    let target = ownJidOf(wa);
    if (toSender) target = ctx.isGroup ? (info.participant || ctx.jid) : ctx.jid;

    if (kind === 'image') await wa.sendMessage(target, { image: buf, caption: inner.imageMessage.caption || '' });
    else if (kind === 'video') await wa.sendMessage(target, { video: buf, caption: inner.videoMessage.caption || '' });
    else await wa.sendMessage(target, { audio: buf, mimetype: inner.audioMessage.mimetype || 'audio/ogg; codecs=opus', ptt: true });
    await wa.sendMessage(ctx.jid, { react: { text: '✅', key: m.key } }).catch(() => {});
  } catch (e) {
    console.log('VV ERR', e.message);
    await ctx.reply('❌ Could not open it. The media may have expired. Reply directly to the view-once message.');
  }
}

// ================= ANTIDELETE (alerts go ONLY to your own personal chat) =================
async function handleDeleted(wa, deletedId) {
  try {
    if (!antiDeleteEnabled || !deletedId || seenDeletes.has(deletedId)) return;
    const stored = messageStore.get(deletedId);
    if (!stored?.message || stored.key?.fromMe) return;
    seenDeletes.add(deletedId);
    const me = ownJidOf(wa);
    const c = normalizeMessageContent(stored.message) || {};
    const chat = stored.key.remoteJid || '';
    const isGrp = chat.endsWith('@g.us');
    const who = digits(stored.key.participant || chat);
    const head = `*🗑️ DELETED MESSAGE*\n👤 From: ${stored.pushName || 'Unknown'} (+${who})\n💬 Chat: ${isGrp ? 'Group ' + chat.split('@')[0] : 'Private'}\n🕒 ${new Date().toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })}`;
    const text = getText(c);
    const kind = c.imageMessage ? 'image' : c.videoMessage ? 'video' : c.audioMessage ? 'audio' : c.stickerMessage ? 'sticker' : null;
    if (kind) {
      let buf = null;
      try { buf = await downloadMediaMessage(stored, 'buffer', {}, { logger, reuploadRequest: wa.updateMediaMessage }); } catch {}
      if (buf) {
        if (kind === 'image') return void await wa.sendMessage(me, { image: buf, caption: `${head}${text ? '\n📝 ' + text : ''}` });
        if (kind === 'video') return void await wa.sendMessage(me, { video: buf, caption: `${head}${text ? '\n📝 ' + text : ''}` });
        await wa.sendMessage(me, { text: head + `\n📎 ${kind}` });
        if (kind === 'audio') return void await wa.sendMessage(me, { audio: buf, mimetype: c.audioMessage.mimetype || 'audio/ogg; codecs=opus', ptt: !!c.audioMessage.ptt });
        return void await wa.sendMessage(me, { sticker: buf });
      }
    }
    await wa.sendMessage(me, { text: `${head}\n📝 ${text || '[media / unsupported message]'}` });
  } catch (e) { console.log('antidelete err', e.message); }
}

// ================= MESSAGE HANDLER =================
async function onMessage(wa, m) {
  const content = normalizeMessageContent(m.message) || m.message;
  const jid = m.key.remoteJid;
  const text = getText(content).trim();
  const prefix = config.prefix || '.';
  if (!text || !text.startsWith(prefix)) return;
  const args = text.slice(prefix.length).trim().split(/\s+/);
  const cmd = (args.shift() || '').toLowerCase();
  if (!cmd) return;

  const isGroup = jid.endsWith('@g.us');
  const ownJid = ownJidOf(wa);
  const senderJid = m.key.fromMe ? ownJid : jidNormalizedUser(m.key.participant || jid);
  const isOwner = !!m.key.fromMe || ownerDigits(wa).has(digits(senderJid));
  if (config.mode === 'private' && !isOwner) return;

  const reply = (t) => wa.sendMessage(jid, typeof t === 'object' && t ? t : { text: String(t ?? '') }, { quoted: m }).catch((e) => console.log('reply err', e.message));
  let metaCache = null;
  const getMeta = async () => (metaCache ||= (isGroup ? await wa.groupMetadata(jid) : null));
  const info = content?.extendedTextMessage?.contextInfo || {};
  let targets = info.mentionedJid?.length ? info.mentionedJid : info.participant ? [info.participant] : [];
  if (!targets.length) targets = args.map((a) => a.replace(/\D/g, '')).filter((n) => n.length >= 8).map((n) => n + '@s.whatsapp.net');

  const ctx = {
    sock: wa, conn: wa, m, msg: m, jid, remote: jid, args, text: args.join(' '), cmd, prefix, config, settings: config,
    content, isGroup, isOwner, reply, getMeta, targets, sender: digits(senderJid), senderNum: digits(senderJid), senderJid,
    botJid: ownJid, botLid: wa.user?.lid ? jidNormalizedUser(wa.user.lid) : '', commandList: [...new Set([...registry.values()])]
  };
  console.log(`CMD: ${prefix}${cmd} owner:${isOwner} group:${isGroup}`);

  // ---- built-in owner features (work even if a command file is broken) ----
  if (cmd === 'vv') return openViewOnce(wa, m, ctx, false);
  if (cmd === 'vv2' || cmd === 'vv3') return openViewOnce(wa, m, ctx, true);
  if (cmd === 'antidelete' || cmd === 'antidel' || cmd === 'ad') {
    if (!isOwner) return reply('❌ This command is for the owner only.');
    const s = (args[0] || '').toLowerCase();
    if (s === 'on') { antiDeleteEnabled = true; saveAntiDelete(); return reply('✅ *Antidelete ON*\nDeleted messages will be sent to your personal chat only.'); }
    if (s === 'off') { antiDeleteEnabled = false; saveAntiDelete(); return reply('❌ *Antidelete OFF*'); }
    return reply(`*Antidelete:* ${antiDeleteEnabled ? 'ON ✅' : 'OFF ❌'}\nUse: ${prefix}antidelete on / off`);
  }
  if (cmd === 'alwaysonline' || cmd === 'alwayson') {
    if (!isOwner) return reply('❌ This command is for the owner only.');
    const s = (args[0] || '').toLowerCase();
    if (s === 'on') { alwaysOnline = true; saveOnline(); setOnlinePresence(wa, true); return reply('🟢 *Always Online ON*'); }
    if (s === 'off') { alwaysOnline = false; saveOnline(); setOnlinePresence(wa, false); return reply('⚫ *Always Online OFF*'); }
    return reply(`*Always Online:* ${alwaysOnline ? 'ON 🟢' : 'OFF ⚫'}\nUse: ${prefix}alwaysonline on / off`);
  }

  // ---- everything else comes from the commands folder ----
  const entry = registry.get(cmd);
  if (!entry) return;
  if (entry.owner && !isOwner) return reply('❌ This command is for the owner only.');
  if (entry.group && !isGroup) return reply('❌ This command can only be used in groups.');
  try {
    if (entry.kind === 'ctx') await entry.fn(ctx);
    else await entry.fn(wa, m, args, { config, prefix, commands: registry, conn: wa, isOwner, isGroup, ctx });
  } catch (e) {
    if (e instanceof CommandError) return reply(e.message);
    console.log(`CMD ERR (${cmd}):`, e?.message || e);
    return reply(`❌ Something went wrong while running ${prefix}${cmd}. Please check how you used it and try again.`);
  }
}

// ================= SOCKET =================
async function startBot(num) {
  if (num) { lastNumber = num; cleanAuth(); }
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();
  const wa = makeWASocket({
    version, logger,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
    markOnlineOnConnect: alwaysOnline,
    getMessage: async (key) => messageStore.get(key.id)?.message
  });
  sock = wa; status = 'CONNECTING';
  wa.ev.on('creds.update', saveCreds);

  wa.ev.on('messages.upsert', async (upsert) => {
    try {
      for (const mm of upsert.messages || []) {
        if (!mm?.message || !mm.key?.id) continue;
        const proto = normalizeMessageContent(mm.message)?.protocolMessage || mm.message.protocolMessage;
        if (proto) {
          if (proto.type === 0 || proto.type === 'REVOKE') await handleDeleted(wa, proto.key?.id);
          continue;
        }
        if (!messageStore.has(mm.key.id)) { messageStore.set(mm.key.id, Object.assign(mm, { __t: Date.now() })); pruneStore(); }
      }
      if (upsert.type !== 'notify') return;            // ignore history sync / appended messages
      for (const m of upsert.messages || []) {
        if (!m?.message || !m.key?.remoteJid || m.key.remoteJid === 'status@broadcast') continue;
        if (m.message.protocolMessage) continue;
        const t = tsOf(m);
        if (t && Date.now() / 1000 - t > 60) continue;  // never run old commands later
        if (seenIds.has(m.key.id)) continue;
        seenIds.add(m.key.id);
        await onMessage(wa, m).catch((e) => console.log('onMessage err', e?.message || e));
      }
    } catch (e) { console.log('upsert crash', e.message); }
  });

  // fallback for deletions delivered as an update
  wa.ev.on('messages.update', async (updates) => {
    try {
      for (const { key, update } of updates) {
        const st = update?.messageStubType;
        if (st === 1 || st === 'REVOKE') await handleDeleted(wa, key?.id);
      }
    } catch (e) { console.log('antidel update err', e.message); }
  });

  wa.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection === 'open') {
      status = 'CONNECTED'; pairCode = null;
      await loadCommands();
      setOnlinePresence(wa, alwaysOnline);
      console.log(`✅ ONLINE - ${registry.size} names - ONLINE ${alwaysOnline ? 'ON' : 'OFF'} - ANTIDELETE ${antiDeleteEnabled ? 'ON' : 'OFF'}`);
    } else if (connection === 'close') {
      status = 'DISCONNECTED'; sock = null;
      if (onlineInterval) clearInterval(onlineInterval);
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) {
        clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => startBot().catch((e) => console.log('reconnect err', e.message)), 3000);
      }
    }
  });

  if (num) { await new Promise((r) => setTimeout(r, 3500)); try { let code = await wa.requestPairingCode(num); code = code.toUpperCase().replace(/[^A-Z0-9]/g, '').match(/.{1,4}/g).join('-'); pairCode = code; pairTime = Date.now(); } catch (e) {} }
}

app.post('/pair', async (req, res) => { const n = normNum(req.body?.num); lastNumber = n; pairCode = null; status = 'CONNECTING'; await startBot(n); for (let i = 0; i < 12; i++) { if (pairCode) break; await new Promise((r) => setTimeout(r, 1000)); } res.redirect('/'); });

process.on('uncaughtException', (e) => console.log('uncaught:', e?.message || e));
process.on('unhandledRejection', (e) => console.log('unhandled:', e?.message || e));

await loadCommands();
app.listen(PORT, () => console.log('BOT READY ON ' + PORT));
if (fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0) startBot().catch((e) => console.log('start err', e.message));
