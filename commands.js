// SHADOW MD MINI - commands.js (ESM)
// Self-contained: command registry + message handler + menu with picture.
import crypto from 'node:crypto';
import * as baileys from '@whiskeysockets/baileys';

const B = (k) => baileys[k] ?? baileys.default?.[k];
const jidNormalizedUser = B('jidNormalizedUser') ?? ((j) => (j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent');

export const settings = {
  prefix: process.env.PREFIX || '.',
  mode: process.env.MODE || 'public', // public | private
  version: '2.0.0',
  botName: 'Shadow MD Mini',
  ownerName: 'Rana Furqan Rajput',
  picUrl: process.env.PIC_URL || 'https://i.ibb.co/zhHMv7FM/file-00000000842482109e9c8ceae82aa6f8.png',
};

const startedAt = Date.now();
let picBuf = null;

async function getPic() {
  if (picBuf) return picBuf;
  try {
    const r = await fetch(settings.picUrl);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    picBuf = Buffer.from(await r.arrayBuffer());
  } catch (e) {
    console.log('picture fetch failed:', e.message);
  }
  return picBuf;
}

export async function sendPic(sock, jid, caption, quoted) {
  const opts = quoted ? { quoted } : {};
  const buf = await getPic();
  if (buf) {
    try { return await sock.sendMessage(jid, { image: buf, caption }, opts); }
    catch (e) { console.log('send image failed:', e.message); }
  }
  return sock.sendMessage(jid, { text: caption }, opts);
}

// ---------------- helpers ----------------
const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), mi = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${mi}m ${s % 60}s`;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hashNum = (str) => parseInt(crypto.createHash('md5').update(str.toLowerCase()).digest('hex').slice(0, 6), 16);
const MORSE = { a:'.-',b:'-...',c:'-.-.',d:'-..',e:'.',f:'..-.',g:'--.',h:'....',i:'..',j:'.---',k:'-.-',l:'.-..',m:'--',n:'-.',o:'---',p:'.--.',q:'--.-',r:'.-.',s:'...',t:'-',u:'..-',v:'...-',w:'.--',x:'-..-',y:'-.--',z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.' };

const JOKES = [
  'Why do programmers prefer dark mode? Because light attracts bugs.',
  'I told my computer I needed a break. Now it won\'t stop sending me Kit-Kat ads.',
  'Why did the phone go to school? To get smarter.',
  'There are 10 kinds of people: those who understand binary and those who don\'t.',
  'My WiFi and I have a lot in common: we both disconnect when things get serious.',
  'A SQL query walks into a bar, sees two tables and asks: "Can I join you?"',
];
const QUOTES = [
  'The only way to do great work is to love what you do. - Steve Jobs',
  'Success is not final, failure is not fatal: it is the courage to continue that counts. - Churchill',
  'Believe you can and you are halfway there. - Theodore Roosevelt',
  'Dream big, work hard, stay humble.',
  'Great things never come from comfort zones.',
  'Do something today that your future self will thank you for.',
];
const FACTS = [
  'Honey never spoils. Edible honey has been found in ancient Egyptian tombs.',
  'Octopuses have three hearts.',
  'A day on Venus is longer than a year on Venus.',
  'Bananas are berries, but strawberries are not.',
  'The first computer bug was a real moth found in a Harvard computer in 1947.',
  'Sharks existed before trees.',
];
const TRUTHS = [
  'What is your biggest fear?', 'What is the last lie you told?', 'Who was your first crush?',
  'What is your most embarrassing moment?', 'What is a secret you never told anyone?', 'What habit do you want to quit?',
];
const DARES = [
  'Send a voice note singing your favorite song.', 'Change your profile picture to a funny one for 1 hour.',
  'Text your best friend "I miss you" right now.', 'Do 15 push-ups and tell us.',
  'Speak in rhymes for the next 5 minutes.', 'Send your most recent selfie.',
];
const PICKUPS = [
  'Are you WiFi? Because I feel a strong connection.',
  'Are you a keyboard? Because you are just my type.',
  'Do you have a map? I keep getting lost in your eyes.',
  'Is your name Google? Because you have everything I am searching for.',
];
const BALL = ['Yes, definitely.', 'It is certain.', 'Most likely.', 'Ask again later.', 'Cannot predict now.', 'Don\'t count on it.', 'My sources say no.', 'Very doubtful.'];

// ---------------- registry ----------------
const commands = new Map();
const list = [];
function add(name, opts, run) {
  const c = { name, cat: 'general', desc: '', alias: [], ...opts, run };
  list.push(c);
  commands.set(name, c);
  c.alias.forEach((a) => commands.set(a, c));
}

// ===== GENERAL =====
add('menu', { cat: 'general', alias: ['help', 'commands', 'list'] }, async (c) => {
  const cats = { general: 'ɢᴇɴᴇʀᴀʟ', fun: 'ꜰᴜɴ', tools: 'ᴛᴏᴏʟꜱ', text: 'ᴛᴇxᴛ', group: 'ɢʀᴏᴜᴘ', owner: 'ᴏᴡɴᴇʀ' };
  let out = `╭━━〔 *${settings.botName.toUpperCase()}* 〕━━┈⊷\n`;
  out += `┃ ✦ Owner   : ${settings.ownerName}\n┃ ✦ Commands: ${list.length}\n`;
  out += `┃ ✦ Runtime : ${fmtTime(Date.now() - startedAt)}\n┃ ✦ Prefix  : ${settings.prefix}\n`;
  out += `┃ ✦ Mode    : ${settings.mode}\n┃ ✦ Version : ${settings.version}\n╰━━━━━━━━━━━━━━━━━━┈⊷\n`;
  for (const [key, label] of Object.entries(cats)) {
    const items = list.filter((x) => x.cat === key);
    if (!items.length) continue;
    out += `\n╭━━〔 ${label} 〕━━┈⊷\n`;
    out += items.map((x) => `┋ ● ${x.name}`).join('\n');
    out += `\n╰━━━━━━━━━━━━━━┈⊷\n`;
  }
  out += `\n_${settings.botName}_`;
  await sendPic(c.sock, c.jid, out, c.m);
});
add('ping', { cat: 'general' }, async (c) => {
  const t = Date.now();
  const sent = await c.reply('🏓 Pinging...');
  const ms = Date.now() - t;
  try { await c.sock.sendMessage(c.jid, { text: `🏓 Pong! ${ms}ms`, edit: sent.key }); }
  catch { await c.reply(`🏓 Pong! ${ms}ms`); }
});
add('alive', { cat: 'general' }, async (c) => {
  await sendPic(c.sock, c.jid, `✅ *${settings.botName}* is alive!\n\n⏱ Runtime: ${fmtTime(Date.now() - startedAt)}\n⚙ Mode: ${settings.mode}\n📌 Prefix: ${settings.prefix}\n\nType ${settings.prefix}menu for commands.`, c.m);
});
add('runtime', { cat: 'general', alias: ['uptime'] }, (c) => c.reply(`⏱ Runtime: ${fmtTime(Date.now() - startedAt)}`));
add('owner', { cat: 'general' }, (c) => c.reply(`👑 Owner: ${settings.ownerName}`));
add('furqan', { cat: 'general' }, (c) => c.reply(`👑 ${settings.ownerName}\nCreator of ${settings.botName}.`));
add('rana', { cat: 'general' }, (c) => c.reply(`👑 ${settings.ownerName}\nCreator of ${settings.botName}.`));
add('botinfo', { cat: 'general', alias: ['info'] }, (c) => c.reply(`🤖 *${settings.botName}*\nVersion: ${settings.version}\nCommands: ${list.length}\nPrefix: ${settings.prefix}\nMode: ${settings.mode}\nNode: ${process.version}\nRuntime: ${fmtTime(Date.now() - startedAt)}`));
add('time', { cat: 'general' }, (c) => c.reply(`🕒 ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi' })} (PKT)`));
add('date', { cat: 'general' }, (c) => c.reply(`📅 ${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`));
add('jid', { cat: 'general', alias: ['id'] }, (c) => c.reply(`🆔 Chat: ${c.jid}\n👤 You: ${c.sender}`));
add('echo', { cat: 'general', alias: ['say'] }, (c) => c.args.length ? c.reply(c.text.replace(/^[^\w\s]+/, '')) : c.reply('Usage: echo <text>'));

// ===== FUN =====
add('coin', { cat: 'fun', alias: ['flip'] }, (c) => c.reply(`🪙 ${pick(['Heads', 'Tails'])}`));
add('dice', { cat: 'fun', alias: ['roll'] }, (c) => c.reply(`🎲 You rolled: ${1 + Math.floor(Math.random() * 6)}`));
add('8ball', { cat: 'fun' }, (c) => c.args.length ? c.reply(`🎱 ${pick(BALL)}`) : c.reply('Usage: 8ball <question>'));
add('joke', { cat: 'fun' }, (c) => c.reply(`😂 ${pick(JOKES)}`));
add('quote', { cat: 'fun' }, (c) => c.reply(`💬 ${pick(QUOTES)}`));
add('fact', { cat: 'fun' }, (c) => c.reply(`📚 ${pick(FACTS)}`));
add('truth', { cat: 'fun' }, (c) => c.reply(`🤔 Truth: ${pick(TRUTHS)}`));
add('dare', { cat: 'fun' }, (c) => c.reply(`🔥 Dare: ${pick(DARES)}`));
add('pickup', { cat: 'fun' }, (c) => c.reply(`😉 ${pick(PICKUPS)}`));
add('rps', { cat: 'fun' }, (c) => {
  const me = c.args[0]?.toLowerCase();
  if (!['rock', 'paper', 'scissors'].includes(me)) return c.reply('Usage: rps rock|paper|scissors');
  const bot = pick(['rock', 'paper', 'scissors']);
  const win = { rock: 'scissors', paper: 'rock', scissors: 'paper' };
  const res = me === bot ? 'Draw 🤝' : win[me] === bot ? 'You win 🎉' : 'I win 😎';
  return c.reply(`You: ${me}\nBot: ${bot}\n${res}`);
});
add('choose', { cat: 'fun' }, (c) => {
  const opts = c.text.split(/[|,]/).map((x) => x.trim()).filter(Boolean);
  return opts.length < 2 ? c.reply('Usage: choose a | b | c') : c.reply(`✅ I choose: *${pick(opts)}*`);
});
add('rate', { cat: 'fun' }, (c) => c.args.length ? c.reply(`⭐ I rate "${c.text}" ${hashNum(c.text) % 101}/100`) : c.reply('Usage: rate <anything>'));
add('ship', { cat: 'fun' }, (c) => {
  const [a, b] = c.text.split(/[|,]| and /i).map((x) => x.trim());
  if (!a || !b) return c.reply('Usage: ship name1 | name2');
  return c.reply(`💞 ${a} + ${b} = ${hashNum([a, b].sort().join('')) % 101}%`);
});
add('random', { cat: 'fun' }, (c) => {
  const max = Math.min(parseInt(c.args[0]) || 100, 1e9);
  return c.reply(`🔢 ${1 + Math.floor(Math.random() * max)} (1-${max})`);
});

// ===== TOOLS =====
add('calc', { cat: 'tools', alias: ['math'] }, (c) => {
  const expr = c.text.replace(/\^/g, '**').replace(/x/gi, '*');
  if (!expr || !/^[0-9+\-*/().%\s]+$/.test(expr)) return c.reply('Usage: calc 12*(3+4)');
  try { const v = Function(`"use strict";return (${expr})`)(); return c.reply(`🧮 ${c.text} = ${v}`); }
  catch { return c.reply('❌ Invalid expression'); }
});
add('genpass', { cat: 'tools', alias: ['password'] }, (c) => {
  const len = Math.min(Math.max(parseInt(c.args[0]) || 12, 6), 64);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let p = '';
  for (let i = 0; i < len; i++) p += chars[crypto.randomInt(chars.length)];
  return c.reply(`🔐 ${p}`);
});
add('uuid', { cat: 'tools' }, (c) => c.reply(`🆔 ${crypto.randomUUID()}`));
add('base64e', { cat: 'tools', alias: ['b64e'] }, (c) => c.args.length ? c.reply(Buffer.from(c.text).toString('base64')) : c.reply('Usage: base64e <text>'));
add('base64d', { cat: 'tools', alias: ['b64d'] }, (c) => c.args.length ? c.reply(Buffer.from(c.text, 'base64').toString('utf8')) : c.reply('Usage: base64d <text>'));
add('binary', { cat: 'tools' }, (c) => c.args.length ? c.reply([...c.text].map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')) : c.reply('Usage: binary <text>'));
add('morse', { cat: 'tools' }, (c) => c.args.length ? c.reply([...c.text.toLowerCase()].map((ch) => (ch === ' ' ? '/' : MORSE[ch] || '')).join(' ')) : c.reply('Usage: morse <text>'));

// ===== TEXT =====
add('reverse', { cat: 'text' }, (c) => c.args.length ? c.reply([...c.text].reverse().join('')) : c.reply('Usage: reverse <text>'));
add('upper', { cat: 'text' }, (c) => c.args.length ? c.reply(c.text.toUpperCase()) : c.reply('Usage: upper <text>'));
add('lower', { cat: 'text' }, (c) => c.args.length ? c.reply(c.text.toLowerCase()) : c.reply('Usage: lower <text>'));
add('title', { cat: 'text' }, (c) => c.args.length ? c.reply(c.text.toLowerCase().replace(/\b\w/g, (x) => x.toUpperCase())) : c.reply('Usage: title <text>'));
add('count', { cat: 'text' }, (c) => c.args.length ? c.reply(`🔤 Characters: ${c.text.length}\n📝 Words: ${c.args.length}`) : c.reply('Usage: count <text>'));
add('mock', { cat: 'text' }, (c) => c.args.length ? c.reply([...c.text.toLowerCase()].map((x, i) => (i % 2 ? x.toUpperCase() : x)).join('')) : c.reply('Usage: mock <text>'));
add('clap', { cat: 'text' }, (c) => c.args.length ? c.reply(c.args.join(' 👏 ')) : c.reply('Usage: clap <text>'));
add('repeat', { cat: 'text' }, (c) => {
  const n = Math.min(parseInt(c.args[0]) || 0, 10);
  return n && c.args.length > 1 ? c.reply(Array(n).fill(c.args.slice(1).join(' ')).join('\n')) : c.reply('Usage: repeat 3 hello');
});

// ===== GROUP =====
add('groupinfo', { cat: 'group', group: true, alias: ['ginfo'] }, async (c) => {
  const meta = await c.getMeta();
  return c.reply(`👥 *${meta.subject}*\nMembers: ${meta.participants.length}\nAdmins: ${meta.participants.filter((p) => p.admin).length}\nDescription: ${meta.desc || 'none'}`);
});
add('tagall', { cat: 'group', group: true, admin: true }, async (c) => {
  const meta = await c.getMeta();
  const ids = meta.participants.map((p) => p.id);
  const body = `📢 ${c.text || 'Attention everyone!'}\n\n` + ids.map((id) => `@${id.split('@')[0]}`).join('\n');
  return c.sock.sendMessage(c.jid, { text: body, mentions: ids }, { quoted: c.m });
});
add('hidetag', { cat: 'group', group: true, admin: true }, async (c) => {
  const meta = await c.getMeta();
  return c.sock.sendMessage(c.jid, { text: c.text || '📢', mentions: meta.participants.map((p) => p.id) }, { quoted: c.m });
});
add('admins', { cat: 'group', group: true }, async (c) => {
  const meta = await c.getMeta();
  const ads = meta.participants.filter((p) => p.admin).map((p) => p.id);
  return c.sock.sendMessage(c.jid, { text: '👮 *Admins*\n' + ads.map((id) => `@${id.split('@')[0]}`).join('\n'), mentions: ads }, { quoted: c.m });
});
add('link', { cat: 'group', group: true, admin: true, alias: ['grouplink'] }, async (c) => {
  try { return c.reply('🔗 https://chat.whatsapp.com/' + (await c.sock.groupInviteCode(c.jid))); }
  catch { return c.reply('❌ Make the bot admin first.'); }
});
const partAction = (action, label) => async (c) => {
  const t = c.targets;
  if (!t.length) return c.reply(`Usage: reply to / mention / give number.`);
  try { await c.sock.groupParticipantsUpdate(c.jid, t, action); return c.reply(`✅ ${label}: ${t.map((x) => '+' + x.split('@')[0]).join(', ')}`); }
  catch { return c.reply('❌ Failed. Make sure the bot is admin.'); }
};
add('kick', { cat: 'group', group: true, admin: true, alias: ['remove'] }, partAction('remove', 'Removed'));
add('add', { cat: 'group', group: true, admin: true }, partAction('add', 'Added'));
add('promote', { cat: 'group', group: true, admin: true }, partAction('promote', 'Promoted'));
add('demote', { cat: 'group', group: true, admin: true }, partAction('demote', 'Demoted'));
add('mute', { cat: 'group', group: true, admin: true, alias: ['close'] }, async (c) => {
  try { await c.sock.groupSettingUpdate(c.jid, 'announcement'); return c.reply('🔇 Group muted (admins only).'); }
  catch { return c.reply('❌ Make the bot admin first.'); }
});
add('unmute', { cat: 'group', group: true, admin: true, alias: ['open'] }, async (c) => {
  try { await c.sock.groupSettingUpdate(c.jid, 'not_announcement'); return c.reply('🔊 Group unmuted.'); }
  catch { return c.reply('❌ Make the bot admin first.'); }
});

// ===== OWNER =====
add('mode', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if (!['public', 'private'].includes(v)) return c.reply(`Current mode: ${settings.mode}\nUsage: mode public|private`);
  settings.mode = v;
  return c.reply(`✅ Mode set to ${v}`);
});
add('prefix', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0];
  if (!v || v.length > 3) return c.reply(`Current prefix: ${settings.prefix}\nUsage: prefix <symbol>`);
  settings.prefix = v;
  return c.reply(`✅ Prefix set to ${v}`);
});
add('restart', { cat: 'owner', owner: true }, async (c) => {
  await c.reply('♻ Restarting...');
  setTimeout(() => process.exit(0), 1000);
});
add('block', { cat: 'owner', owner: true }, async (c) => {
  if (!c.targets.length) return c.reply('Usage: reply / mention / number');
  for (const t of c.targets) await c.sock.updateBlockStatus(t, 'block').catch(() => {});
  return c.reply('🚫 Blocked.');
});
add('unblock', { cat: 'owner', owner: true }, async (c) => {
  if (!c.targets.length) return c.reply('Usage: reply / mention / number');
  for (const t of c.targets) await c.sock.updateBlockStatus(t, 'unblock').catch(() => {});
  return c.reply('✅ Unblocked.');
});

export const totalCommands = () => list.length;

// ---------------- handler ----------------
export async function handleMessage(sock, m) {
  const jid = m.key?.remoteJid;
  if (!jid || jid === 'status@broadcast' || jid.endsWith('@newsletter') || !m.message) return;

  const content = normalizeMessageContent ? normalizeMessageContent(m.message) : m.message;
  const text = (content?.conversation || content?.extendedTextMessage?.text ||
    content?.imageMessage?.caption || content?.videoMessage?.caption || '').trim();
  if (!text.startsWith(settings.prefix)) return;

  const [rawName, ...args] = text.slice(settings.prefix.length).trim().split(/\s+/);
  const cmd = commands.get((rawName || '').toLowerCase());
  if (!cmd) return;

  const isGroup = jid.endsWith('@g.us');
  const sender = jidNormalizedUser(m.key.fromMe ? sock.user.id : (m.key.participant || jid));
  const senderNum = sender.split('@')[0];
  const isOwner = !!m.key.fromMe || (process.env.OWNER_NUMBER || '').split(',').map((x) => x.trim()).includes(senderNum);
  if (settings.mode === 'private' && !isOwner) return;

  const reply = (t) => sock.sendMessage(jid, { text: String(t) }, { quoted: m });
  let metaCache = null;
  const getMeta = async () => (metaCache ||= await sock.groupMetadata(jid));

  const info = content?.extendedTextMessage?.contextInfo || content?.imageMessage?.contextInfo || content?.videoMessage?.contextInfo || {};
  let targets = info.mentionedJid?.length ? info.mentionedJid : info.participant ? [info.participant] : [];
  if (!targets.length) {
    targets = args.map((a) => a.replace(/\D/g, '')).filter((a) => a.length >= 8).map((n) => n + '@s.whatsapp.net');
  }

  const c = { sock, m, jid, args, text: args.join(' '), isGroup, isOwner, sender, reply, getMeta, targets };

  try {
    if (cmd.owner && !isOwner) return await reply('❌ Owner only command.');
    if (cmd.group && !isGroup) return await reply('❌ This command works in groups only.');
    if (cmd.admin && !isOwner) {
      const meta = await getMeta();
      const p = meta.participants.find((x) => jidNormalizedUser(x.id) === sender);
      if (!p?.admin) return await reply('❌ Only group admins can use this command.');
    }
    await cmd.run(c);
  } catch (e) {
    console.log(`command ${cmd.name} error:`, e.message);
    await reply('⚠ Something went wrong. Try again.').catch(() => {});
  }
}

export default handleMessage;

export const hasCommand = (name) => commands.has(String(name || '').toLowerCase());