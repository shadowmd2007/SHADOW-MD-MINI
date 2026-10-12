// SHADOW-MD - commands.js  (asli kaam karne wali commands + menu)
const fs = require('fs');
const path = require('path');
let B = null;
try { B = require('@whiskeysockets/baileys'); } catch {}
let pino = () => ({ level: 'silent' });
try { pino = require('pino'); } catch {}

// ====================== SETTINGS (settings.json mein save hoti hain) ======================
const DATA_DIR = process.env.DATA_DIR || process.env.AUTH_DIR || __dirname;
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch {}
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const DEFAULTS = {
  prefix: '.', mode: 'public', botname: 'SHADOW-MD ULTRA',
  ownername: 'Rana Furqan Rajput 🌹', ownernumber: '923003719761', credit: 'RANA FURQAN',
  antidelete: false, antilink: false, anticall: false, anticallmsg: '📵 Calls band hain. Message karo.',
  autoread: false, autotyping: false, recording: false, online: false,
  statusview: false, statuslike: false, statusemoji: '❤️',
  autoreact: false, reactemoji: '❤️',
  welcome: false, goodbye: false,
  welcometext: '👋 Welcome @user to *@group*!', goodbyetext: '👋 Allah hafiz @user!',
  stickername: 'SHADOW-MD', sudo: [],
};
let S = { ...DEFAULTS };
try { S = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; } catch {}
const save = () => { try { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(S, null, 2)); } catch (e) { console.log('settings save error: ' + e.message); } };

// ====================== HELPERS ======================
const startedAt = Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const num = (j) => String(j || '').split('@')[0].split(':')[0];
const toJid = (n) => `${num(n)}@s.whatsapp.net`;
const rnd = (a) => a[Math.floor(Math.random() * a.length)];
const hash = (s) => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.codePointAt(0)) >>> 0; return h; };
const unwrap = (message) => { try { return (B?.normalizeMessageContent && B.normalizeMessageContent(message)) || message; } catch { return message; } };
const bodyOf = (msg) => msg?.conversation || msg?.extendedTextMessage?.text || msg?.imageMessage?.caption || msg?.videoMessage?.caption || msg?.documentMessage?.caption || '';
const ctxInfoOf = (msg) => {
  if (!msg) return null;
  for (const k of Object.keys(msg)) { const v = msg[k]; if (v && typeof v === 'object' && v.contextInfo) return v.contextInfo; }
  return null;
};
const pIds = (p) => [p.id, p.jid, p.lid, p.phoneNumber].filter(Boolean).map(num);
const pJid = (p) => { const j = p.jid || p.phoneNumber || p.id; return String(j).includes('@') ? j : toJid(j); };
function runtime() {
  let s = Math.floor((Date.now() - startedAt) / 1000);
  const h = Math.floor(s / 3600); s %= 3600;
  const mi = Math.floor(s / 60); s %= 60;
  return `${h}h ${mi}m ${s}s`;
}
async function http(url, opts = {}) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), opts.timeout || 30000);
  try { return await fetch(url, { signal: ctl.signal, ...opts }); } finally { clearTimeout(t); }
}
const getJSON = async (url) => { const r = await http(url); if (!r.ok) throw new Error('API error ' + r.status); return r.json(); };

// small caps (menu ke liye)
const SC = { a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ғ',g:'ɢ',h:'ʜ',i:'ɪ',j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',s:'s',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ' };
const sc = (t) => String(t).toLowerCase().replace(/[a-z]/g, (c) => SC[c]);

// ====================== COMMAND NAMES (menu ki categories) ======================
const R = (p, a, b) => Array.from({ length: b - a + 1 }, (_, i) => p + (a + i));
const W = (s) => s.trim().split(/\s+/);
const AI_NAMES = W(`ai bot gpt gpt2 gpt3 gpt35turbo gpt4 gpt4turbo gpt4o gpt4omini gpt4vision gpt4all gpt5 gpt5mini chatgpt chatgpt35 chatgpt4 chatgpt4o chatgpt4turbo chatgptplus chatgptelite o1 o1mini o1preview o3 o3mini o4 o4mini o5 o5mini copilot mscopilot elitecopilot
 deepseek deepseekv2 deepseekv3 deepseekv4 deepseekr1 deepseekr2 deepseekcoder deepseekcoder2 deepseekmath deepseekllm deepseekvl deepseekchat
 gemini geminipro geminiultra gemininano gemini15 gemini15pro gemini15flash gemini20 gemini20flash gemini25 gemini25pro gemini25flash gemini3 gemini3pro gemini3flash gemini3ultra bard palm palm2
 grok grok1 grok15 grok2 grok2mini grok3 grok3mini grok4 grok4mini grokbeta grokvision
 claude claude1 claude2 claudeinstant claude3 claude3opus claude3sonnet claude3haiku claude35 claude35sonnet claude35haiku claude37 claude37sonnet claude4 claude4opus claude4sonnet claudeopus claudesonnet claudehaiku
 qwen qwen15 qwen2 qwen25 qwen3 qwencoder qwenmath qwenvl qwenmax qwenplus qwenturbo llama2 llama3 llama4 mistral mixtral falcon bloom bloomz orca vicuna alpaca phi2 phi3 phi4 wizard codet5 codex starcoder codegen kimi perplexity yi yi34b command commandr jurassic ai21 solar lumin redpajama dolly hugging openassist gptneo gptj flant5 starlin talkai brain elite elitegpt assistant smart genius proai ultra maxai nova zenith apex vertex pulse quantum neo omega mathgpt grammar`);
const LOGO_NAMES = W(`advglow amongus bplogo bpstyle cartoontxt deletetxt clouds flag3d freecreate galaxy galaxywp glitch glow gradient lightfx logomaker luxurygold neon papercut pixelglitch royal sand typography beach underwater watercolor write`);
const ROLES = W(`dad mom son daughter boyfriend girlfriend twin partner bodyguard boss employee pet servant idol fan ghost angel devil king queen slave master fool rich poor bhai bahan wife husband chacha chachi nana nani mama mami bestfriend enemy crush teacher student rival runmureed bacha bachi`);
const ACT = {
  shoot:'🔫', sleep:'😴', clap:'👏', shrug:'🤷', stare:'👀', wave:'👋', poke:'👉', confused:'😕', smile:'😊', peck:'😚', wink:'😉', sip:'☕', blush:'😊', smug:'😏', tickle:'🤭', yeet:'🚀', think:'🤔', highfive:'🙏', feed:'🍽️', bite:'😬', teehee:'🤭', shocked:'😱', bleh:'😛', bored:'🥱', nom:'😋', nya:'🐱', yawn:'🥱', facepalm:'🤦', cuddle:'🫂', happy:'😄', carry:'💪', hug:'🤗', kabedon:'😳', baka:'😡', bonk:'🔨', pat:'🫳', angry:'😠', spin:'🌀', shake:'🫨', run:'🏃', nod:'🙂', nope:'🙅', kiss:'😘', dance:'💃', punch:'👊', handshake:'🤝', slap:'🖐️', cry:'😭', pout:'😤', blowkiss:'😘', handhold:'🤝', salute:'🫡', thumbsup:'👍', laugh:'😂', tableflip:'🤬', yes:'✅', no:'❌', stop:'✋', sorry:'🙏', sad:'😢', scared:'😨', surprised:'😲', tired:'😩', sigh:'😮‍💨', shy:'🙈', nuzzle:'🥰', cool:'😎', celebrate:'🎉', yay:'🥳', headbang:'🤘', nosebleed:'🩸', bully:'😈', cringe:'😬', kill:'🔪', glomp:'🤗',
};
const METERS = W(`chad npc maincharacter delulu sigma rizz simp vibe aura`);
const FONT_N = R('font', 1, 105);

const CATS = [
  ['owner menu', W(`furqan rana vv3 vv vv2 delete forward leave hidetag ik block unblock pair follow follow2 unfollow unfollow2 status status2 fullpp`)],
  ['main menu', W(`menu help alive owner ping ping2 uptime settings fetch githubstalk anime`)],
  ['ai menu', AI_NAMES],
  ['anime menu', W(`garl waifu neko megumin maid awoo`)],
  ['download menu', W(`tts gitclone`)],
  ['fun menu', [...W(`img character emix compatibility roast 8ball compliment lovetest emoji ship`), ...ROLES, ...W(`flirt quote cosplay joke technologia taroun cake pickup rate shipname dice coin fact redflag greenflag truth dare wyr horoscope lurk marige`), ...METERS, ...Object.keys(ACT).filter((k) => k !== 'kick'), ...W(`repeat shayari animegirl`), ...R('animegirl', 1, 5), 'dog']],
  ['group menu', W(`del unmute mute tagall kick promote demote gcpp revoke link ginfo updategdesc updategname poll out newgc end join invite tag acceptall rejectall requests accept reject add everyone`)],
  ['logo menu', LOGO_NAMES],
  ['other menu', ['getpp', 'mee', 'srepo', 'gpass', ...R('anime', 1, 5)]],
  ['search menu', W(`define yts`)],
  ['setting menu', W(`privacy blocklist getbio setonline setname updatebio getprivacy`)],
  ['settings menu', W(`sudo delsudo listsudo statusemoji statuslike welcome goodbye setwelcome setgoodbye autoread antilink antidelete recording statusview autoreact anticall anticallmsg autotyping online mode prefix botname ownername ownernumber stickername reactemojis`)],
  ['tools menu', ['sticker', 'font', ...FONT_N, ...W(`npm wthr clock loading`)]],
  ['utility menu', W(`id raw2 praytime`)],
];

// ====================== REGISTRY ======================
const commands = new Map();
const REAL = new Set();
function def(names, fn, opts = {}) {
  for (const n of [].concat(names)) { commands.set(n, { fn, ...opts }); REAL.add(n); }
}

// ====================== CONTEXT ======================
async function getMeta(c) {
  if (!c._meta) c._meta = await c.sock.groupMetadata(c.jid);
  return c._meta;
}
function targetJid(c) {
  if (c.mentioned[0]) return c.mentioned[0];
  if (c.quoted && c.ci?.participant) return c.ci.participant;
  const n = (c.args.join(' ').match(/\d{7,15}/) || [])[0];
  return n ? toJid(n) : null;
}
const sayTo = (c, text, mentions) => c.sock.sendMessage(c.jid, { text, mentions }, { quoted: c.m });
async function sendImg(c, url, caption) { await c.sock.sendMessage(c.jid, { image: { url }, caption: caption || '' }, { quoted: c.m }); }
async function downloadFrom(c, wantTypes = /imageMessage|videoMessage|audioMessage|stickerMessage/) {
  let fake = null;
  const own = Object.keys(c.msg).find((k) => wantTypes.test(k));
  if (own) fake = c.m;
  else if (c.quoted) {
    let inner = c.quoted.viewOnceMessageV2?.message || c.quoted.viewOnceMessage?.message || c.quoted.viewOnceMessageV2Extension?.message || c.quoted;
    const t = Object.keys(inner).find((k) => wantTypes.test(k));
    if (t) fake = { key: { remoteJid: c.jid, id: c.ci.stanzaId, participant: c.ci.participant }, message: inner };
  }
  if (!fake) return null;
  const buffer = await B.downloadMediaMessage(fake, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: c.sock.updateMediaMessage });
  const type = Object.keys(unwrap(fake.message)).find((k) => wantTypes.test(k));
  return { buffer, type };
}

// ====================== MAIN / OWNER ======================
def('furqan', (c) => sayTo(c, `*Hello Jani! 👋\nMe RANA FURQAN ka bot hu! 😎*\n\n*Owner: ${S.ownernumber}*\n*Bot: ${S.botname} ✅*\n*Commands: ${REAL.size}*`));
def('rana', (c) => sayTo(c, `*RANA FURQAN 👑*\n*Number: ${S.ownernumber}*\n*Bot Active!* ✅`));
def('alive', (c) => sayTo(c, `*${S.botname} ALIVE ✅*\n*Owner: ${S.ownername}*\n*Runtime: ${runtime()}*`));
def('owner', (c) => sayTo(c, `*👑 OWNER*\n*Name: ${S.ownername}*\n*Number: ${S.ownernumber}*`));
def('ping', (c) => sayTo(c, `*Pong! ⚡*\n*Speed: ${Math.max(0, Date.now() - c.m.messageTimestamp * 1000)}ms*`));
def('ping2', async (c) => { const t = Date.now(); const s = await c.sock.sendMessage(c.jid, { text: 'Pinging...' }, { quoted: c.m }); await c.sock.sendMessage(c.jid, { text: `*Pong 2! ⚡ ${Date.now() - t}ms*`, edit: s.key }); });
def('uptime', (c) => sayTo(c, `*🚀 Runtime: ${runtime()}*`));
def('id', (c) => sayTo(c, `*Chat ID:* ${c.jid}\n*Sender:* ${c.sender}`));
def('fetch', async (c) => {
  const u = c.args[0]; if (!/^https?:\/\//i.test(u || '')) return sayTo(c, `Use: ${S.prefix}fetch https://example.com`);
  const r = await http(u); const t = (await r.text()).slice(0, 3000); await sayTo(c, `*Status:* ${r.status}\n\n${t}`);
}, { owner: true });
def('githubstalk', async (c) => {
  if (!c.args[0]) return sayTo(c, `Use: ${S.prefix}githubstalk username`);
  const u = await getJSON('https://api.github.com/users/' + encodeURIComponent(c.args[0]));
  await c.sock.sendMessage(c.jid, { image: { url: u.avatar_url }, caption: `*👤 ${u.name || u.login}*\nUser: ${u.login}\nRepos: ${u.public_repos}\nFollowers: ${u.followers}\nFollowing: ${u.following}\nBio: ${u.bio || '-'}\n${u.html_url}` }, { quoted: c.m });
});
def('srepo', async (c) => {
  if (!c.text) return sayTo(c, `Use: ${S.prefix}srepo naam`);
  const d = await getJSON('https://api.github.com/search/repositories?per_page=5&q=' + encodeURIComponent(c.text));
  await sayTo(c, (d.items || []).map((r, i) => `${i + 1}. *${r.full_name}* ⭐${r.stargazers_count}\n${r.html_url}`).join('\n\n') || 'Kuch nahi mila');
});
def('gpass', (c) => {
  const n = Math.min(Math.max(parseInt(c.args[0]) || 12, 6), 40);
  const ch = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';
  sayTo(c, '🔐 ' + Array.from({ length: n }, () => ch[Math.floor(Math.random() * ch.length)]).join(''));
});
def('define', async (c) => {
  if (!c.args[0]) return sayTo(c, `Use: ${S.prefix}define word`);
  const d = await getJSON('https://api.dictionaryapi.dev/api/v2/entries/en/' + encodeURIComponent(c.args[0]));
  const m1 = d[0]?.meanings?.[0]; await sayTo(c, `*${d[0].word}* (${m1?.partOfSpeech})\n${m1?.definitions?.[0]?.definition}\n${m1?.definitions?.[0]?.example ? '\n_' + m1.definitions[0].example + '_' : ''}`);
});
def('npm', async (c) => {
  if (!c.args[0]) return sayTo(c, `Use: ${S.prefix}npm package`);
  const d = await getJSON('https://registry.npmjs.org/' + encodeURIComponent(c.args[0]) + '/latest');
  await sayTo(c, `*📦 ${d.name}* v${d.version}\n${d.description || ''}\nLicense: ${d.license || '-'}\nhttps://npmjs.com/package/${d.name}`);
});
def('wthr', async (c) => {
  const city = c.text || 'Lahore';
  const r = await http('https://wttr.in/' + encodeURIComponent(city) + '?format=%l:+%c+%t+(feels+%f)+%h+humidity+%w');
  await sayTo(c, '🌦️ ' + (await r.text()));
});
def('clock', (c) => sayTo(c, '🕒 ' + new Date().toLocaleString('en-GB', { timeZone: c.text || 'Asia/Karachi' }) + ' (' + (c.text || 'Asia/Karachi') + ')'));
def('praytime', async (c) => {
  const city = c.text || 'Lahore';
  const d = await getJSON(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Pakistan&method=1`);
  const t = d.data.timings; await sayTo(c, `🕌 *Namaz ke auqaat: ${city}*\nFajr: ${t.Fajr}\nSunrise: ${t.Sunrise}\nDhuhr: ${t.Dhuhr}\nAsr: ${t.Asr}\nMaghrib: ${t.Maghrib}\nIsha: ${t.Isha}`);
});
def('raw2', (c) => sayTo(c, '```' + JSON.stringify(c.quoted || c.msg, null, 1).slice(0, 3500) + '```'));
def('tts', async (c) => {
  const t = (c.text || bodyOf(unwrap(c.quoted))).slice(0, 200); if (!t) return sayTo(c, `Use: ${S.prefix}tts text`);
  await c.sock.sendMessage(c.jid, { audio: { url: 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ur&q=' + encodeURIComponent(t) }, mimetype: 'audio/mpeg', ptt: true }, { quoted: c.m });
});
def('gitclone', async (c) => {
  const mm = (c.args[0] || '').match(/github\.com\/([^/\s]+)\/([^/\s#?]+)/i); if (!mm) return sayTo(c, `Use: ${S.prefix}gitclone https://github.com/user/repo`);
  const repo = mm[2].replace(/\.git$/, '');
  await c.sock.sendMessage(c.jid, { document: { url: `https://api.github.com/repos/${mm[1]}/${repo}/zipball` }, fileName: repo + '.zip', mimetype: 'application/zip' }, { quoted: c.m });
});
def('loading', async (c) => {
  const s = await c.sock.sendMessage(c.jid, { text: 'Loading ░░░░░░░░░░ 0%' }, { quoted: c.m });
  for (const p of [20, 40, 60, 80, 100]) { await sleep(700); const f = p / 10; await c.sock.sendMessage(c.jid, { text: `Loading ${'█'.repeat(f)}${'░'.repeat(10 - f)} ${p}%`, edit: s.key }); }
});

// view once
def(['vv', 'vv2', 'vv3'], async (c) => {
  if (!c.quoted) return sayTo(c, 'View-once photo/video ko reply karke likho.');
  const d = await downloadFrom(c); if (!d) return sayTo(c, 'Is message mein photo/video nahi mili.');
  const to = c.name === 'vv' ? c.jid : c.botJid;
  const key = d.type.replace('Message', '');
  await c.sock.sendMessage(to, { [key]: d.buffer, caption: 'View once ✅' }, { quoted: to === c.jid ? c.m : undefined });
}, { owner: true });

// sticker
def('sticker', async (c) => {
  const d = await downloadFrom(c, /imageMessage|videoMessage/); if (!d) return sayTo(c, 'Photo/video ko reply karke ya caption mein .sticker likho.');
  let WSF; try { WSF = require('wa-sticker-formatter'); } catch { return sayTo(c, '⚠️ Sticker ke liye package.json mein "wa-sticker-formatter" add karo.'); }
  const st = new WSF.Sticker(d.buffer, { pack: S.stickername, author: S.ownername, type: 'full', quality: 60 });
  await c.sock.sendMessage(c.jid, { sticker: await st.toBuffer() }, { quoted: c.m });
});

// profile
def('getpp', async (c) => {
  const j = targetJid(c) || (c.isGroup ? c.jid : c.sender);
  const url = await c.sock.profilePictureUrl(j, 'image').catch(() => null);
  if (!url) return sayTo(c, 'Profile picture nahi mili (private ya hai hi nahi).');
  await sendImg(c, url, '✅ Profile picture');
});
def('mee', async (c) => {
  const url = await c.sock.profilePictureUrl(c.sender, 'image').catch(() => null);
  const t = `*👤 Aap*\nNumber: ${num(c.sender)}\nOwner: ${c.isOwner ? 'Haan 👑' : 'Nahi'}`;
  if (url) await sendImg(c, url, t); else await sayTo(c, t);
});
def('getbio', async (c) => {
  const j = targetJid(c) || c.sender; const r = await c.sock.fetchStatus(j);
  const s = Array.isArray(r) ? r[0]?.status : r?.status; await sayTo(c, '📝 Bio: ' + (typeof s === 'object' ? s?.status : s) || '-');
});
def('privacy', async (c) => { const p = await c.sock.fetchPrivacySettings(true); await sayTo(c, '🔒 *Privacy*\n' + Object.entries(p).map(([k, v]) => `${k}: ${v}`).join('\n')); }, { owner: true });
commands.set('getprivacy', commands.get('privacy')); REAL.add('getprivacy');
def('blocklist', async (c) => { const l = await c.sock.fetchBlocklist(); await sayTo(c, `🚫 Blocked: ${l.length}\n` + l.map((x) => '• ' + num(x)).join('\n')); }, { owner: true });
def('setname', async (c) => { if (!c.text) return sayTo(c, 'Naya naam likho.'); await c.sock.updateProfileName(c.text); await sayTo(c, '✅ Naam badal diya'); }, { owner: true });
def('updatebio', async (c) => { if (!c.text) return sayTo(c, 'Naya bio likho.'); await c.sock.updateProfileStatus(c.text); await sayTo(c, '✅ Bio badal diya'); }, { owner: true });
def('block', async (c) => { const j = targetJid(c) || (!c.isGroup ? c.jid : null); if (!j) return sayTo(c, 'Kisi ko tag/reply karo.'); await c.sock.updateBlockStatus(j, 'block'); await sayTo(c, '🚫 Block kar diya'); }, { owner: true });
def('unblock', async (c) => { const j = targetJid(c) || (!c.isGroup ? c.jid : null); if (!j) return sayTo(c, 'Kisi ko tag/reply karo.'); await c.sock.updateBlockStatus(j, 'unblock'); await sayTo(c, '✅ Unblock kar diya'); }, { owner: true });

// ====================== SETTINGS (owner) ======================
const TOGGLES = ['antidelete', 'antilink', 'anticall', 'autoread', 'autotyping', 'recording', 'online', 'statusview', 'statuslike', 'autoreact', 'welcome', 'goodbye'];
for (const key of TOGGLES) {
  def(key, async (c) => {
    const v = (c.args[0] || '').toLowerCase();
    if (!['on', 'off'].includes(v)) return sayTo(c, `Use: ${S.prefix}${key} on/off\nAbhi: ${S[key] ? 'ON ✅' : 'OFF ❌'}`);
    S[key] = v === 'on'; save();
    if (key === 'online') c.sock.sendPresenceUpdate(S.online ? 'available' : 'unavailable').catch(() => {});
    await sayTo(c, `*${key.toUpperCase()}* ${S[key] ? 'ON ✅' : 'OFF ❌'}`);
  }, { owner: true });
}
commands.set('setonline', commands.get('online')); REAL.add('setonline');
def('mode', async (c) => { const v = (c.args[0] || '').toLowerCase(); if (!['public', 'private'].includes(v)) return sayTo(c, `Use: ${S.prefix}mode public/private\nAbhi: ${S.mode}`); S.mode = v; save(); await sayTo(c, `Mode: *${v}* ✅`); }, { owner: true });
def('prefix', async (c) => { const v = c.args[0]; if (!v || v.length > 3) return sayTo(c, `Use: ${S.prefix}prefix !\nAbhi: ${S.prefix}`); S.prefix = v; save(); await sayTo(c, `Prefix ab: *${v}* ✅`); }, { owner: true });
const TEXT_SETTERS = { botname: 'botname', ownername: 'ownername', ownernumber: 'ownernumber', stickername: 'stickername', anticallmsg: 'anticallmsg', setwelcome: 'welcometext', setgoodbye: 'goodbyetext', statusemoji: 'statusemoji', reactemojis: 'reactemoji' };
for (const [name, key] of Object.entries(TEXT_SETTERS)) {
  def(name, async (c) => {
    if (!c.text) return sayTo(c, `Use: ${S.prefix}${name} <text>\nAbhi: ${S[key]}`);
    S[key] = key === 'ownernumber' ? c.text.replace(/\D/g, '') : c.tex