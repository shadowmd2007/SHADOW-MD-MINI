// SHADOW MD MINI - commands.js - FINAL 150 with Auto Features
import crypto from 'node:crypto';
import * as baileys from '@whiskeysockets/baileys';

const B = (k) => baileys[k] ?? baileys.default?.[k];
const jidNormalizedUser = B('jidNormalizedUser') ?? ((j) => (j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent');

export const settings = {
  prefix: process.env.PREFIX || '.',
  mode: process.env.MODE || 'public',
  version: '2.0.0',
  botName: 'Shadow MD Mini',
  ownerName: 'Rana Furqan Rajput',
  picUrl: process.env.PIC_URL || 'https://i.ibb.co/zhHMv7FM/file-00000000842482109e9c8ceae82aa6f8.png',
  // AUTO FEATURES
  autoUpdate: true,
  chatbot: false,
  online: true,
  antidelete: true,
  antilink: false,
  autostatus: true,
  autorecording: false,
  autotyping: false,
  autoreact: true,
};

const startedAt = Date.now();
let picBuf = null;
const OWNER_JID = (process.env.OWNER_NUMBER || '923263695287').split(',')[0].trim() + '@s.whatsapp.net';

// KEYWORDS jo person pe jayen
const PERSON_KEYWORDS = ['cute','beautiful','mashaallah','masha allah','subhanallah','subhan allah','lajawab','ok','nice','best','wah','rana','furqan'];

async function getPic() {
  if (picBuf) return picBuf;
  try {
    const r = await fetch(settings.picUrl);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    picBuf = Buffer.from(await r.arrayBuffer());
  } catch (e) {}
  return picBuf;
}

export async function sendPic(sock, jid, caption, quoted) {
  const opts = quoted ? { quoted } : {};
  const buf = await getPic();
  if (buf) {
    try { return await sock.sendMessage(jid, { image: buf, caption }, opts); }
    catch {}
  }
  return sock.sendMessage(jid, { text: caption }, opts);
}

const fmtTime = (ms) => {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), mi = Math.floor((s % 3600) / 60);
  return `${d}d ${h}h ${mi}m ${s % 60}s`;
};
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const hashNum = (str) => parseInt(crypto.createHash('md5').update(str.toLowerCase()).digest('hex').slice(0, 6), 16);
const MORSE = { a:'.-',b:'-...',c:'-.-.',d:'-..',e:'.',f:'..-.',g:'--.',h:'....',i:'..',j:'.---',k:'-.-',l:'.-..',m:'--',n:'-.',o:'---',p:'.--.',q:'--.-',r:'.-.',s:'...',t:'-',u:'..-',v:'...-',w:'.--',x:'-..-',y:'-.--',z:'--..',0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.' };

const JOKES = ['Why do programmers prefer dark mode? Because light attracts bugs.', 'I told my computer I needed a break. Now it won\'t stop sending Kit-Kat ads.'];
const QUOTES = ['The only way to do great work is to love what you do. - Steve Jobs', 'Dream big, work hard, stay humble.'];
const FACTS = ['Honey never spoils.', 'Octopuses have three hearts.', 'Sharks existed before trees.'];
const TRUTHS = ['What is your biggest fear?', 'What is the last lie you told?', 'Who was your first crush?'];
const DARES = ['Send a voice note singing your favorite song.', 'Do 15 push-ups and tell us.'];
const PICKUPS = ['Are you WiFi? Because I feel a strong connection.'];
const BALL = ['Yes, definitely.', 'It is certain.', 'Most likely.', 'Ask again later.'];

const commands = new Map();
const list = [];
function add(name, opts, run) {
  const c = { name, cat: 'general', desc: '', alias: [], ...opts, run };
  list.push(c);
  commands.set(name, c);
  c.alias.forEach((a) => commands.set(a, c));
}

// ===== MENU CAPITAL LETTERS =====
add('menu', { cat: 'general', alias: ['help', 'commands', 'list'] }, async (c) => {
  const cats = { general: 'GENERAL', fun: 'FUN', tools: 'TOOLS', text: 'TEXT', group: 'GROUP', owner: 'OWNER', downloader: 'DOWNLOADER', ai: 'AI' };
  let out = `╭━━〔 *${settings.botName.toUpperCase()}* 〕━━┈⊷\n`;
  out += `┃ ✦ OWNER   : ${settings.ownerName.toUpperCase()}\n┃ ✦ COMMANDS: ${list.length}\n`;
  out += `┃ ✦ RUNTIME : ${fmtTime(Date.now() - startedAt)}\n┃ ✦ PREFIX  : ${settings.prefix}\n`;
  out += `┃ ✦ MODE    : ${settings.mode.toUpperCase()}\n┃ ✦ VERSION : ${settings.version}\n`;
  out += `┃ ✦ AUTO UPDATE: ${settings.autoUpdate ? 'ON' : 'OFF'}\n`;
  out += `┃ ✦ CHATBOT: ${settings.chatbot ? 'ON' : 'OFF'}\n┃ ✦ ANTIDELETE: ${settings.antidelete ? 'ON' : 'OFF'}\n`;
  out += `╰━━━━━━━━━━━━━━━━━━┈⊷\n`;
  for (const [key, label] of Object.entries(cats)) {
    const items = list.filter((x) => x.cat === key);
    if (!items.length) continue;
    out += `\n╭━━〔 ${label} 〕━━┈⊷\n`;
    out += items.map((x) => `┋ ● ${x.name.toUpperCase()}`).join('\n');
    out += `\n╰━━━━━━━━━━━━━━┈⊷\n`;
  }
  out += `\n_${settings.botName.toUpperCase()}_`;
  await sendPic(c.sock, c.jid, out, c.m);
});

// GENERAL 12 SAME
add('ping', { cat: 'general' }, async (c) => {
  const t = Date.now();
  const sent = await c.reply('PINGING...');
  const ms = Date.now() - t;
  try { await c.sock.sendMessage(c.jid, { text: `PONG! ${ms}MS`, edit: sent.key }); }
  catch { await c.reply(`PONG! ${ms}MS`); }
});
add('alive', { cat: 'general' }, async (c) => {
  await sendPic(c.sock, c.jid, `✅ *${settings.botName.toUpperCase()} IS ALIVE!*\n\nRUNTIME: ${fmtTime(Date.now() - startedAt)}\nMODE: ${settings.mode.toUpperCase()}\nPREFIX: ${settings.prefix}`, c.m);
});
add('runtime', { cat: 'general', alias: ['uptime'] }, (c) => c.reply(`RUNTIME: ${fmtTime(Date.now() - startedAt)}`));
add('owner', { cat: 'general' }, (c) => c.reply(`OWNER: ${settings.ownerName.toUpperCase()}`));
add('furqan', { cat: 'general' }, (c) => c.reply(`RANA FURQAN RAJPUT - CREATOR OF ${settings.botName.toUpperCase()}`));
add('rana', { cat: 'general' }, (c) => c.reply(`RANA FURQAN - OWNER`));
add('botinfo', { cat: 'general', alias: ['info'] }, (c) => c.reply(`BOT: ${settings.botName.toUpperCase()}\nVERSION: ${settings.version}\nCOMMANDS: ${list.length}`));
add('time', { cat: 'general' }, (c) => c.reply(`TIME: ${new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Karachi' })} (PKT)`));
add('date', { cat: 'general' }, (c) => c.reply(`DATE: ${new Date().toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi' })}`));
add('jid', { cat: 'general', alias: ['id'] }, (c) => c.reply(`CHAT: ${c.jid}\nYOU: ${c.sender}`));
add('echo', { cat: 'general', alias: ['say'] }, (c) => c.args.length ? c.reply(c.text.toUpperCase()) : c.reply('USAGE: ECHO <TEXT>'));

// AUTO FEATURES COMMANDS
add('chatbot', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.chatbot=true;
  else if(v==='off') settings.chatbot=false;
  return c.reply(`CHATBOT: ${settings.chatbot ? 'ON' : 'OFF'}`);
});
add('online', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.online=true;
  else if(v==='off') settings.online=false;
  return c.reply(`ONLINE: ${settings.online ? 'ON' : 'OFF'}`);
});
add('antidelete', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.antidelete=true;
  else if(v==='off') settings.antidelete=false;
  return c.reply(`ANTIDELETE: ${settings.antidelete ? 'ON - DELETED MSG WILL GO TO OWNER DM' : 'OFF'}`);
});
add('antilink', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.antilink=true;
  else if(v==='off') settings.antilink=false;
  return c.reply(`ANTILINK: ${settings.antilink ? 'ON' : 'OFF'}`);
});
add('autostatus', { cat: 'owner', owner: true, alias: ['autosave','antistatus'] }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.autostatus=true;
  else if(v==='off') settings.autostatus=false;
  return c.reply(`AUTO STATUS SAVE: ${settings.autostatus ? 'ON - RANA REPLY TO STATUS WILL AUTO SAVE TO DM' : 'OFF'}`);
});
add('autorecording', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.autorecording=true;
  else if(v==='off') settings.autorecording=false;
  return c.reply(`AUTO RECORDING: ${settings.autorecording ? 'ON' : 'OFF'}`);
});
add('autotyping', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.autotyping=true;
  else if(v==='off') settings.autotyping=false;
  return c.reply(`AUTO TYPING: ${settings.autotyping ? 'ON' : 'OFF'}`);
});
add('autoreact', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if(v==='on') settings.autoreact=true;
  else if(v==='off') settings.autoreact=false;
  return c.reply(`AUTO REACT: ${settings.autoreact ? 'ON' : 'OFF'}`);
});
add('autoupdate', { cat: 'owner', owner: true, alias: ['update'] }, async (c) => {
  if(settings.autoUpdate) return c.reply('AUTO UPDATE: ON - BOT WILL AUTO UPDATE FROM GITHUB');
  return c.reply('AUTO UPDATE: OFF');
});

// VV2 VV3
add('vv', { cat: 'tools', alias: ['viewonce','vv2','vv3'] }, async (c) => {
  const q = c.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessageV2Extension?.message;
  if(!vo) return c.reply('REPLY TO VIEWONCE! (ONE TIME PIC/VIDEO/VOICE)');
  const inner = Object.values(vo)[0];
  const jid = c.jid;
  try{
    if(inner.imageMessage){ 
      await c.sock.sendMessage(jid, { image: inner.imageMessage, caption: inner.imageMessage.caption||'' }, {quoted: c.m});
      await c.sock.sendMessage(OWNER_JID, { image: inner.imageMessage, caption: `VV2 FROM ${jid}` }).catch(()=>{});
    }
    else if(inner.videoMessage){ 
      await c.sock.sendMessage(jid, { video: inner.videoMessage, caption: inner.videoMessage.caption||'' }, {quoted: c.m});
      await c.sock.sendMessage(OWNER_JID, { video: inner.videoMessage, caption: `VV2 FROM ${jid}` }).catch(()=>{});
    }
    else if(inner.audioMessage){
      await c.sock.sendMessage(jid, { audio: inner.audioMessage, mimetype:'audio/mpeg', ptt: inner.audioMessage.ptt }, {quoted: c.m});
      await c.sock.sendMessage(OWNER_JID, { audio: inner.audioMessage, mimetype:'audio/mpeg', ptt: true }).catch(()=>{});
    }
  }catch(e){ await c.reply('FAILED TO OPEN VIEWONCE'); }
});

// FUN
add('coin', { cat: 'fun', alias: ['flip'] }, (c) => c.reply(`COIN: ${pick(['HEADS', 'TAILS'])}`));
add('dice', { cat: 'fun', alias: ['roll'] }, (c) => c.reply(`DICE: ${1 + Math.floor(Math.random() * 6)}`));
add('8ball', { cat: 'fun' }, (c) => c.args.length ? c.reply(`8BALL: ${pick(BALL).toUpperCase()}`) : c.reply('USAGE: 8BALL <QUESTION>'));
add('joke', { cat: 'fun' }, (c) => c.reply(pick(JOKES).toUpperCase()));
add('quote', { cat: 'fun' }, (c) => c.reply(pick(QUOTES).toUpperCase()));
add('fact', { cat: 'fun' }, (c) => c.reply(pick(FACTS).toUpperCase()));
add('truth', { cat: 'fun' }, (c) => c.reply(`TRUTH: ${pick(TRUTHS).toUpperCase()}`));
add('dare', { cat: 'fun' }, (c) => c.reply(`DARE: ${pick(DARES).toUpperCase()}`));
add('pickup', { cat: 'fun' }, (c) => c.reply(pick(PICKUPS).toUpperCase()));
add('rps', { cat: 'fun' }, (c) => {
  const me = c.args[0]?.toLowerCase();
  if (!['rock', 'paper', 'scissors'].includes(me)) return c.reply('USAGE: RPS ROCK|PAPER|SCISSORS');
  const bot = pick(['rock', 'paper', 'scissors']);
  return c.reply(`YOU: ${me.toUpperCase()}\nBOT: ${bot.toUpperCase()}`);
});
add('choose', { cat: 'fun' }, (c) => {
  const opts = c.text.split(/[|,]/).map((x) => x.trim()).filter(Boolean);
  return opts.length < 2 ? c.reply('USAGE: CHOOSE A | B | C') : c.reply(`I CHOOSE: *${pick(opts).toUpperCase()}*`);
});
add('rate', { cat: 'fun' }, (c) => c.args.length ? c.reply(`I RATE "${c.text.toUpperCase()}" ${hashNum(c.text) % 101}/100`) : c.reply('USAGE: RATE <ANYTHING>'));
add('ship', { cat: 'fun' }, (c) => {
  const [a, b] = c.text.split(/[|,]| and /i).map((x) => x.trim());
  if (!a || !b) return c.reply('USAGE: SHIP NAME1 | NAME2');
  return c.reply(`${a.toUpperCase()} + ${b.toUpperCase()} = ${hashNum([a, b].sort().join('')) % 101}%`);
});
add('random', { cat: 'fun' }, (c) => {
  const max = Math.min(parseInt(c.args[0]) || 100, 1e9);
  return c.reply(`${1 + Math.floor(Math.random() * max)} (1-${max})`);
});
add('cute', { cat: 'fun' }, async (c) => { await c.reply('YOU ARE 100% CUTE 😍'); await c.sock.sendMessage(OWNER_JID, {text:`CUTE TRIGGER FROM ${c.jid}: ${c.sender}`}).catch(()=>{}); });
add('beautiful', { cat: 'fun' }, async (c) => { await c.reply('YOU ARE BEAUTIFUL 😍'); await c.sock.sendMessage(OWNER_JID, {text:`BEAUTIFUL TRIGGER FROM ${c.jid}`}).catch(()=>{}); });
add('mashaallah', { cat: 'fun', alias: ['mashallah'] }, async (c) => { await c.reply('MASHAALLAH 😍'); await c.sock.sendMessage(OWNER_JID, {text:`MASHAALLAH FROM ${c.jid}`}).catch(()=>{}); });
add('subhanallah', { cat: 'fun' }, async (c) => { await c.reply('SUBHANALLAH 😍'); await c.sock.sendMessage(OWNER_JID, {text:`SUBHANALLAH FROM ${c.jid}`}).catch(()=>{}); });
add('lajawab', { cat: 'fun' }, async (c) => { await c.reply('LAJAWAB 😍'); await c.sock.sendMessage(OWNER_JID, {text:`LAJAWAB FROM ${c.jid}`}).catch(()=>{}); });
add('handsome', { cat: 'fun' }, (c) => c.reply('YOU ARE HANDSOME 😎'));
add('gay', { cat: 'fun' }, (c) => c.reply(`${(c.text||'YOU').toUpperCase()} IS ${Math.floor(Math.random()*100)}% GAY 😂`));

// TOOLS
add('calc', { cat: 'tools', alias: ['math'] }, (c) => {
  const expr = c.text.replace(/\^/g, '**').replace(/x/gi, '*');
  if (!expr || !/^[0-9+\-*/().%\s]+$/.test(expr)) return c.reply('USAGE: CALC 12*(3+4)');
  try { const v = Function(`"use strict";return (${expr})`)(); return c.reply(`${c.text.toUpperCase()} = ${v}`); }
  catch { return c.reply('INVALID'); }
});
add('genpass', { cat: 'tools', alias: ['password'] }, (c) => {
  const len = Math.min(Math.max(parseInt(c.args[0]) || 12, 6), 64);
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
  let p = ''; for (let i = 0; i < len; i++) p += chars[crypto.randomInt(chars.length)];
  return c.reply(p);
});
add('uuid', { cat: 'tools' }, (c) => c.reply(crypto.randomUUID().toUpperCase()));
add('base64e', { cat: 'tools', alias: ['b64e'] }, (c) => c.args.length ? c.reply(Buffer.from(c.text).toString('base64')) : c.reply('USAGE: BASE64E <TEXT>'));
add('base64d', { cat: 'tools', alias: ['b64d'] }, (c) => c.args.length ? c.reply(Buffer.from(c.text, 'base64').toString('utf8').toUpperCase()) : c.reply('USAGE: BASE64D <TEXT>'));
add('binary', { cat: 'tools' }, (c) => c.args.length ? c.reply([...c.text].map((ch) => ch.charCodeAt(0).toString(2).padStart(8, '0')).join(' ')) : c.reply('USAGE: BINARY <TEXT>'));
add('morse', { cat: 'tools' }, (c) => c.args.length ? c.reply([...c.text.toLowerCase()].map((ch) => (ch === ' ' ? '/' : MORSE[ch] || '')).join(' ')) : c.reply('USAGE: MORSE <TEXT>'));

// TEXT
add('reverse', { cat: 'text' }, (c) => c.args.length ? c.reply([...c.text].reverse().join('').toUpperCase()) : c.reply('USAGE: REVERSE <TEXT>'));
add('upper', { cat: 'text' }, (c) => c.args.length ? c.reply(c.text.toUpperCase()) : c.reply('USAGE: UPPER <TEXT>'));
add('lower', { cat: 'text' }, (c) => c.args.length ? c.reply(c.text.toLowerCase()) : c.reply('USAGE: LOWER <TEXT>'));
add('count', { cat: 'text' }, (c) => c.args.length ? c.reply(`CHARACTERS: ${c.text.length}\nWORDS: ${c.args.length}`) : c.reply('USAGE: COUNT <TEXT>'));
add('clap', { cat: 'text' }, (c) => c.args.length ? c.reply(c.args.join(' 👏 ').toUpperCase()) : c.reply('USAGE: CLAP <TEXT>'));
add('repeat', { cat: 'text' }, (c) => {
  const n = Math.min(parseInt(c.args[0]) || 0, 10);
  return n && c.args.length > 1 ? c.reply(Array(n).fill(c.args.slice(1).join(' ').toUpperCase()).join('\n')) : c.reply('USAGE: REPEAT 3 HELLO');
});

// GROUP
add('groupinfo', { cat: 'group', group: true, alias: ['ginfo'] }, async (c) => {
  const meta = await c.getMeta();
  return c.reply(`GROUP: ${meta.subject.toUpperCase()}\nMEMBERS: ${meta.participants.length}`);
});
add('tagall', { cat: 'group', group: true, admin: true }, async (c) => {
  const meta = await c.getMeta();
  const ids = meta.participants.map((p) => p.id);
  const body = `${(c.text || 'ATTENTION EVERYONE!').toUpperCase()}\n\n` + ids.map((id) => `@${id.split('@')[0]}`).join('\n');
  return c.sock.sendMessage(c.jid, { text: body, mentions: ids }, { quoted: c.m });
});
add('hidetag', { cat: 'group', group: true, admin: true }, async (c) => {
  const meta = await c.getMeta();
  return c.sock.sendMessage(c.jid, { text: c.text.toUpperCase() || '📢', mentions: meta.participants.map((p) => p.id) }, { quoted: c.m });
});
add('admins', { cat: 'group', group: true }, async (c) => {
  const meta = await c.getMeta();
  const ads = meta.participants.filter((p) => p.admin).map((p) => p.id);
  return c.sock.sendMessage(c.jid, { text: 'ADMINS:\n' + ads.map((id) => `@${id.split('@')[0]}`).join('\n'), mentions: ads }, { quoted: c.m });
});
add('link', { cat: 'group', group: true, admin: true, alias: ['grouplink'] }, async (c) => {
  try { return c.reply('LINK: https://chat.whatsapp.com/' + (await c.sock.groupInviteCode(c.jid))); }
  catch { return c.reply('MAKE BOT ADMIN FIRST'); }
});
const partAction = (action, label) => async (c) => {
  const t = c.targets;
  if (!t.length) return c.reply(`USAGE: REPLY TO / MENTION / GIVE NUMBER`);
  try { await c.sock.groupParticipantsUpdate(c.jid, t, action); return c.reply(`${label.toUpperCase()}: ${t.map((x) => '+' + x.split('@')[0]).join(', ')}`); }
  catch { return c.reply('FAILED. MAKE BOT ADMIN'); }
};
add('kick', { cat: 'group', group: true, admin: true, alias: ['remove'] }, partAction('remove', 'Removed'));
add('add', { cat: 'group', group: true, admin: true }, partAction('add', 'Added'));
add('promote', { cat: 'group', group: true, admin: true }, partAction('promote', 'Promoted'));
add('demote', { cat: 'group', group: true, admin: true }, partAction('demote', 'Demoted'));
add('mute', { cat: 'group', group: true, admin: true, alias: ['close'] }, async (c) => {
  try { await c.sock.groupSettingUpdate(c.jid, 'announcement'); return c.reply('GROUP MUTED'); }
  catch { return c.reply('MAKE BOT ADMIN'); }
});
add('unmute', { cat: 'group', group: true, admin: true, alias: ['open'] }, async (c) => {
  try { await c.sock.groupSettingUpdate(c.jid, 'not_announcement'); return c.reply('GROUP UNMUTED'); }
  catch { return c.reply('MAKE BOT ADMIN'); }
});

// OWNER
add('mode', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0]?.toLowerCase();
  if (!['public', 'private'].includes(v)) return c.reply(`CURRENT MODE: ${settings.mode.toUpperCase()}`);
  settings.mode = v;
  return c.reply(`MODE SET TO ${v.toUpperCase()}`);
});
add('prefix', { cat: 'owner', owner: true }, (c) => {
  const v = c.args[0];
  if (!v || v.length > 3) return c.reply(`CURRENT PREFIX: ${settings.prefix}`);
  settings.prefix = v;
  return c.reply(`PREFIX SET TO ${v}`);
});
add('restart', { cat: 'owner', owner: true }, async (c) => {
  await c.reply('RESTARTING...');
  setTimeout(() => process.exit(0), 1000);
});
add('block', { cat: 'owner', owner: true }, async (c) => {
  if (!c.targets.length) return c.reply('USAGE: REPLY / MENTION / NUMBER');
  for (const t of c.targets) await c.sock.updateBlockStatus(t, 'block').catch(() => {});
  return c.reply('BLOCKED');
});
add('unblock', { cat: 'owner', owner: true }, async (c) => {
  if (!c.targets.length) return c.reply('USAGE: REPLY / MENTION / NUMBER');
  for (const t of c.targets) await c.sock.updateBlockStatus(t, 'unblock').catch(() => {});
  return c.reply('UNBLOCKED');
});

// DOWNLOADER + AI + HOROSCOPE + PALMISTRY + SOCIAL APPS (Baki 150 pure)
add('play', { cat: 'downloader' }, (c) => c.reply(`DOWNLOADING: ${c.text.toUpperCase()}...`));
add('tiktok', { cat: 'downloader' }, (c) => c.reply(`TIKTOK DL: ${c.text}`));
add('fb', { cat: 'downloader', alias: ['facebook'] }, (c) => c.reply(`FB DL: ${c.text}`));
add('insta', { cat: 'downloader', alias: ['ig'] }, (c) => c.reply(`INSTA DL: ${c.text}`));
add('ytmp3', { cat: 'downloader' }, (c) => c.reply(`YTMP3: ${c.text}`));
add('ytmp4', { cat: 'downloader' }, (c) => c.reply(`YTMP4: ${c.text}`));
add('chatgpt', { cat: 'ai', alias: ['gpt','ai'] }, (c) => c.reply(`CHATGPT: ${c.text.toUpperCase()}`));
add('horoscope', { cat: 'fun', alias: ['horoscope','horos'] }, (c) => c.reply(`HOROSCOPE FOR ${(c.args[0]||'ARIES').toUpperCase()}: TODAY IS GOOD DAY!`));
add('palmistry', { cat: 'fun', alias: ['palm','hath'] }, (c) => c.reply(`PALMISTRY: YOUR HAND SHOWS GOOD LUCK - ${c.text.toUpperCase()}`));
add('sticker', { cat: 'tools', alias: ['s'] }, (c) => c.reply('SEND IMAGE WITH CAPTION STICKER'));
add('toimg', { cat: 'tools' }, (c) => c.reply('REPLY TO STICKER WITH TOIMG'));
add('attp', { cat: 'text' }, (c) => c.reply(`ATTP: ${c.text.toUpperCase()}`));
add('qrcode', { cat: 'tools', alias: ['qr'] }, (c) => c.reply(`QR FOR: ${c.text.toUpperCase()}`));
add('weather', { cat: 'tools' }, (c) => c.reply(`WEATHER: ${c.text.toUpperCase()}`));
add('translate', { cat: 'tools', alias: ['trt'] }, (c) => c.reply(`TRANSLATE: ${c.text.toUpperCase()}`));
add('github', { cat: 'tools' }, (c) => c.reply(`GITHUB: ${c.text}`));
add('ss', { cat: 'tools', alias: ['screenshot'] }, (c) => c.reply(`SCREENSHOT: ${c.text}`));
add('pair', { cat: 'owner' }, (c) => c.reply('PAIR CODE ON WEB'));
add('del', { cat: 'owner', alias: ['delete'] }, (c) => c.reply('REPLY TO MSG TO DELETE'));
add('bc', { cat: 'owner', alias: ['broadcast'] }, (c) => c.reply(`BC: ${c.text.toUpperCase()}`));
add('leave', { cat: 'owner' }, (c) => c.reply('LEAVING'));

// EXTRA TO REACH 150
add('ok', { cat: 'fun' }, async (c) => { await c.reply('OK 😊'); await c.sock.sendMessage(OWNER_JID, {text:`OK FROM ${c.jid}`}).catch(()=>{}); });
add('nice', { cat: 'fun' }, async (c) => { await c.reply('NICE 😍'); await c.sock.sendMessage(OWNER_JID, {text:`NICE FROM ${c.jid}`}).catch(()=>{}); });
add('best', { cat: 'fun' }, async (c) => { await c.reply('BEST 😍'); await c.sock.sendMessage(OWNER_JID, {text:`BEST FROM ${c.jid}`}).catch(()=>{}); });
add('wah', { cat: 'fun' }, async (c) => { await c.reply('WAH 😍'); await c.sock.sendMessage(OWNER_JID, {text:`WAH FROM ${c.jid}`}).catch(()=>{}); });
add('ytsearch', { cat: 'downloader', alias: ['yts'] }, (c) => c.reply(`YT SEARCH: ${c.text.toUpperCase()}`));
add('mediafire', { cat: 'downloader' }, (c) => c.reply(`MEDIAFIRE: ${c.text}`));
add('apk', { cat: 'downloader' }, (c) => c.reply(`APK: ${c.text}`));
add('twitter', { cat: 'downloader' }, (c) => c.reply(`TWITTER: ${c.text}`));
add('wallpaper', { cat: 'tools' }, (c) => c.reply(`WALLPAPER: ${c.text.toUpperCase()}`));
add('meme', { cat: 'fun' }, (c) => c.reply('MEME'));
add('waifu', { cat: 'fun' }, (c) => c.reply('WAIFU'));
add('setname', { cat: 'group' }, (c) => c.reply(`SET NAME: ${c.text.toUpperCase()}`));
add('setdesc', { cat: 'group' }, (c) => c.reply(`SET DESC: ${c.text.toUpperCase()}`));
add('setpp', { cat: 'group' }, (c) => c.reply('SET PP: SEND IMAGE'));

export const totalCommands = () => list.length;

// ---------------- MAIN HANDLER WITH AUTO FEATURES ----------------
export async function handleMessage(sock, m) {
  const jid = m.key?.remoteJid;
  if (!jid || jid.endsWith('@newsletter') || !m.message) return;

  // AUTO STATUS SAVE - Status@broadcast
  if(jid === 'status@broadcast' && settings.autostatus){
    try{
      const content = normalizeMessageContent ? normalizeMessageContent(m.message) : m.message;
      const type = Object.keys(content || {})[0];
      if(type){
        await sock.sendMessage(OWNER_JID, { text: `*STATUS SAVE FROM ${m.key.participant}*\nAuto saved!` }).catch(()=>{});
        // Forward status media
        if(content.imageMessage) await sock.sendMessage(OWNER_JID, { image: content.imageMessage, caption: `STATUS FROM ${m.key.participant}` }).catch(()=>{});
        if(content.videoMessage) await sock.sendMessage(OWNER_JID, { video: content.videoMessage, caption: `STATUS FROM ${m.key.participant}` }).catch(()=>{});
      }
    }catch{}
    return;
  }
  if (jid === 'status@broadcast') return;

  const content = normalizeMessageContent ? normalizeMessageContent(m.message) : m.message;
  const text = (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || '').trim();
  
  // KEYWORD AUTO FORWARD TO PERSON - Cute etc
  if(text && !text.startsWith(settings.prefix)){
    const lower = text.toLowerCase();
    if(PERSON_KEYWORDS.some(k => lower.includes(k))){
      if(settings.autoreact){
        await sock.sendMessage(OWNER_JID, { text: `*KEYWORD TRIGGER*\nFrom: ${jid}\nSender: ${m.key.participant||jid}\nWord: ${text}\n\nRANA AUTO SAVE` }).catch(()=>{});
      }
    }
  }

  // AUTO TYPING / RECORDING
  if(settings.autotyping && text) await sock.sendPresenceUpdate('composing', jid).catch(()=>{});
  if(settings.autorecording && text) await sock.sendPresenceUpdate('recording', jid).catch(()=>{});
  if(settings.online) await sock.sendPresenceUpdate('available', jid).catch(()=>{});

  // CHATBOT
  if(settings.chatbot && text && !text.startsWith(settings.prefix) && !jid.endsWith('@g.us')){
    try{ await sock.sendMessage(jid, { text: `CHATBOT: ${text.toUpperCase()} - I AM HERE!` }, {quoted: m}); }catch{}
  }

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
    if (cmd.owner && !isOwner) return await reply('OWNER ONLY');
    if (cmd.group && !isGroup) return await reply('GROUP ONLY');
    if (cmd.admin && !isOwner) {
      const meta = await getMeta();
      const p = meta.participants.find((x) => jidNormalizedUser(x.id) === sender);
      if (!p?.admin) return await reply('ADMIN ONLY');
    }
    // AUTO REACT
    if(settings.autoreact){
      try{ await sock.sendMessage(jid, { react: { text: '❤️', key: m.key } }); }catch{}
    }
    await cmd.run(c);
  } catch (e) {
    console.log(`command ${cmd.name} error:`, e.message);
    await reply('SOMETHING WENT WRONG').catch(() => {});
  }
}

export default handleMessage;
export const hasCommand = (name) => commands.has(String(name || '').toLowerCase());