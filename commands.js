import * as baileys from '@whiskeysockets/baileys';
const B = (k) => baileys[k] ?? baileys.default?.[k];
const jidNormalizedUser = B('jidNormalizedUser') ?? ((j) => (j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent');

export const settings = {
  prefix: '.', mode: 'public', version: '6.1 STABLE 150',
  botName: 'Shadow MD Mini', ownerName: 'Rana Furqan Rajput',
  ownerNumber: process.env.OWNER_NUMBER || '923003719761',
  picUrl: 'https://i.ibb.co/zhHMv7FM/file-00000000842482109e9c8ceae82aa6f8.png',
  antidelete: false, autostatus: false,
};

const OWNER_VV_KEYWORDS = ['subhanallah','mashaallah','mashallah'];
const startedAt = Date.now();
const commands = new Map();
const list = [];
export const commandsList = list;

function add(name, opts, run){
  const c={name, cat: opts.cat||'general', alias: opts.alias||[], owner: opts.owner||false, run};
  list.push(c);
  commands.set(name,c);
  c.alias.forEach(a=>commands.set(a,c));
}

async function handleVV(c){
  const ctx = c.m.message?.extendedTextMessage?.contextInfo || c.content?.extendedTextMessage?.contextInfo;
  const q = ctx?.quotedMessage;
  if(!q) return c.reply('Reply to One Time Photo then type SubhanAllah');
  const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessageV2Extension?.message || q;
  const inner = Object.values(vo)[0] || vo;
  if(inner?.imageMessage) await c.sock.sendMessage(c.jid, {image: inner.imageMessage, caption: c.text.toUpperCase()}, {quoted: c.m}).catch(()=>{});
  else if(inner?.videoMessage) await c.sock.sendMessage(c.jid, {video: inner.videoMessage}, {quoted: c.m}).catch(()=>{});
  else if(inner?.audioMessage) await c.sock.sendMessage(c.jid, {audio: inner.audioMessage, ptt:true}, {quoted: c.m}).catch(()=>{});
}

function fmt(ms){
  const s=Math.floor(ms/1000);
  return Math.floor(s/86400)+'d '+Math.floor((s%86400)/3600)+'h '+Math.floor((s%3600)/60)+'m '+s%60+'s';
}

// MENU - HAR LINE ALAG
add('menu', {cat:'general', alias:['help']}, async(c)=>{
  let out = 'SHADOW MD MINI 150\nOWNER: RANA FURQAN 923003719761\nCMDS: '+list.length+'\nRUN: '+fmt(Date.now()-startedAt)+'\n\n';
  const cats = {general:'GENERAL', fun:'FUN', downloader:'DL', group:'GROUP', owner:'OWNER', ai:'AI'};
  for(const k in cats){
    const items = list.filter(x=>x.cat===k);
    if(!items.length) continue;
    out += '--- '+cats[k]+' ---\n';
    for(const it of items){
      out += '. '+it.name.toUpperCase()+'\n';
    }
    out += '\n';
  }
  await c.sock.sendMessage(c.jid, {text: out}, {quoted: c.m});
});

// UPDATE - ONE TIME NAHI
add('update', {cat:'owner', owner:true}, async(c)=>{
  try{
    const mod = await import('./commands.js?v='+Date.now());
    c.reply('UPDATE SUCCESS\nCMDS: '+mod.totalCommands()+'\nAll commands updated');
  }catch(e){
    c.reply('UPDATE FAIL: '+e.message);
  }
});

add('ping', {cat:'general'}, (c)=>c.reply('PONG! BOT WORKING 150 RANA FURQAN'));
add('alive', {cat:'general'}, async(c)=>{ await c.sock.sendMessage(c.jid, {image: {url: settings.picUrl}, caption: 'ALIVE 150 RANA FURQAN 923003719761'}, {quoted: c.m}).catch(()=>c.reply('ALIVE 150')); });
add('runtime', {cat:'general'}, (c)=>c.reply('RUNTIME: '+fmt(Date.now()-startedAt)));
add('owner', {cat:'general'}, (c)=>c.reply('OWNER: Rana Furqan 923003719761'));
add('botinfo', {cat:'general'}, (c)=>c.reply('BOT: SHADOW MD MINI 150'));
add('support', {cat:'general'}, (c)=>c.reply('wa.me/923003719761'));
add('ping2', {cat:'general'}, (c)=>c.reply('PONG2 150 WORKING'));
add('quote', {cat:'fun'}, (c)=>c.reply('Quote: Life is beautiful'));
add('fact', {cat:'fun'}, (c)=>c.reply('Fact: Honey never spoils'));
add('truth', {cat:'fun'}, (c)=>c.reply('Truth: ...'));
add('dare', {cat:'fun'}, (c)=>c.reply('Dare: ...'));
add('pickup', {cat:'fun'}, (c)=>c.reply('Pickup line'));
add('rps', {cat:'fun'}, (c)=>c.reply('Rock Paper Scissors'));
add('choose', {cat:'fun'}, (c)=>c.reply('Choose: '+c.args[0]));
add('rate', {cat:'fun'}, (c)=>c.reply('Rate: 100%'));
add('ship', {cat:'fun'}, (c)=>c.reply('Ship: 100%'));
add('meme', {cat:'fun'}, (c)=>c.reply('Meme'));
add('waifu', {cat:'fun'}, (c)=>c.reply('Waifu'));
add('joke', {cat:'fun'}, (c)=>c.reply('Joke'));
add('roast', {cat:'fun'}, (c)=>c.reply('Roast'));
add('8ball', {cat:'fun'}, (c)=>c.reply('Yes'));
add('coinflip', {cat:'fun'}, (c)=>c.reply('Heads'));
add('gay', {cat:'fun'}, (c)=>c.reply('Gay check 100%'));
add('horoscope', {cat:'fun'}, (c)=>c.reply('Horoscope good'));
add('palmistry', {cat:'fun'}, (c)=>c.reply('Palmistry good'));
add('love', {cat:'fun'}, (c)=>c.reply('Love 100%'));
add('video', {cat:'downloader'}, (c)=>c.reply('Video: '+c.text));
add('play', {cat:'downloader'}, (c)=>c.reply('Play: '+c.text));
add('drama', {cat:'downloader'}, (c)=>c.reply('Drama: '+c.text));
add('cartoon', {cat:'downloader'}, (c)=>c.reply('Cartoon'));
add('song', {cat:'downloader'}, (c)=>c.reply('Song: '+c.text));
add('yt', {cat:'downloader'}, (c)=>c.reply('YT: '+c.text));
add('ytmp3', {cat:'downloader'}, (c)=>c.reply('YTMP3: '+c.text));
add('tiktok', {cat:'downloader'}, (c)=>c.reply('TikTok: '+c.text));
add('insta', {cat:'downloader'}, (c)=>c.reply('Insta: '+c.text));
add('fb', {cat:'downloader'}, (c)=>c.reply('FB: '+c.text));
add('apk', {cat:'downloader'}, (c)=>c.reply('APK: '+c.text));
add('mediafire', {cat:'downloader'}, (c)=>c.reply('Mediafire: '+c.text));
add('gdrive', {cat:'downloader'}, (c)=>c.reply('Gdrive: '+c.text));
add('twitter', {cat:'downloader'}, (c)=>c.reply('Twitter: '+c.text));
add('tagall', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:'TAGALL '+c.text, mentions:meta.participants.map(p=>p.id)}, {quoted:c.m}); });
add('kick', {cat:'group'}, async(c)=>{ if(c.targets.length) await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'remove'); c.reply('Kicked'); });
add('promote', {cat:'group'}, async(c)=>{ await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'promote'); c.reply('Promoted'); });
add('demote', {cat:'group'}, async(c)=>{ await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'demote'); c.reply('Demoted'); });
add('gcpp', {cat:'group'}, (c)=>c.reply('GCPP: Send image with caption .gcpp'));
add('revoke', {cat:'group'}, async(c)=>{ await c.sock.groupRevokeInvite(c.jid); c.reply('Revoked'); });
add('link', {cat:'group'}, async(c)=>{ const code=await c.sock.groupInviteCode(c.jid); c.reply('https://chat.whatsapp.com/'+code); });
add('ginfo', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); c.reply('GINFO: '+meta.subject+' Members:'+meta.participants.length); });
add('updatedesc', {cat:'group'}, async(c)=>{ await c.sock.groupUpdateDescription(c.jid, c.text); c.reply('Desc updated'); });
add('updatename', {cat:'group'}, async(c)=>{ await c.sock.groupUpdateSubject(c.jid, c.text); c.reply('Name updated'); });
add('poll', {cat:'group'}, async(c)=>{ await c.sock.sendMessage(c.jid, {poll: {name: c.text||'POLL', values: ['Yes','No'], selectableCount: 1}}); });
add('out', {cat:'group'}, async(c)=>{ await c.sock.groupLeave(c.jid); });
add('newgc', {cat:'group'}, async(c)=>{ if(c.text) await c.sock.groupCreate(c.text, [c.jid]); c.reply('GC Created'); });
add('join', {cat:'group', owner:true}, async(c)=>{ if(c.text) await c.sock.groupAcceptInvite(c.text.split('/').pop()); c.reply('Joined'); });
add('invite', {cat:'group'}, async(c)=>{ const code=await c.sock.groupInviteCode(c.jid); c.reply(code); });
add('tag', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:c.text||'Hi', mentions:meta.participants.map(p=>p.id)}); });
add('acceptall', {cat:'group'}, async(c)=>{ const reqs=await c.sock.groupRequestParticipantsList(c.jid).catch(()=>[]); for(const r of reqs) await c.sock.groupRequestParticipantsUpdate(c.jid, [r.jid], 'approve'); c.reply('Accepted all'); });
add('rejectall', {cat:'group'}, async(c)=>{ const reqs=await c.sock.groupRequestParticipantsList(c.jid).catch(()=>[]); for(const r of reqs) await c.sock.groupRequestParticipantsUpdate(c.jid, [r.jid], 'reject'); c.reply('Rejected all'); });
add('requests', {cat:'group'}, async(c)=>{ const reqs=await c.sock.groupRequestParticipantsList(c.jid).catch(()=>[]); c.reply('Requests: '+reqs.length); });
add('accept', {cat:'group'}, async(c)=>{ await c.sock.groupRequestParticipantsUpdate(c.jid, c.targets, 'approve'); c.reply('Accepted'); });
add('reject', {cat:'group'}, async(c)=>{ await c.sock.groupRequestParticipantsUpdate(c.jid, c.targets, 'reject'); c.reply('Rejected'); });
add('add', {cat:'group'}, async(c)=>{ await c.sock.groupParticipantsUpdate(c.jid, [c.args[0].replace(/\D/g,'')+'@s.whatsapp.net'], 'add'); c.reply('Added'); });
add('gcstatus', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); c.reply('GCSTATUS: '+(meta.announce?'Closed':'Open')); });
add('gcstatus2', {cat:'group'}, (c)=>c.reply('GCSTATUS2 Open'));
add('del', {cat:'group'}, async(c)=>{ const info=c.m.message?.extendedTextMessage?.contextInfo; if(info?.stanzaId) await c.sock.sendMessage(c.jid, {delete: {remoteJid: c.jid, fromMe: false, id: info.stanzaId, participant: info.participant}}); });
add('chreact', {cat:'group'}, async(c)=>{ await c.sock.sendMessage(c.jid, {react: {text: c.args[0]||'❤️', key: c.m.key}}); });
add('chreact2', {cat:'group'}, async(c)=>{ await c.sock.sendMessage(c.jid, {react: {text: c.args[0]||'🔥', key: c.m.key}}); });
add('vv', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('vv2', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('vv3', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('forward', {cat:'owner', owner:true}, (c)=>c.reply('Forward'));
add('leave', {cat:'owner', owner:true}, async(c)=>{ await c.sock.groupLeave(c.jid); });
add('hidetag', {cat:'owner', owner:true}, async(c)=>{ const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:c.text||'HIDETAG', mentions:meta.participants.map(p=>p.id)}); });
add('ik', {cat:'owner', owner:true}, (c)=>c.reply('IK Done'));
add('block', {cat:'owner', owner:true}, async(c)=>{ if(c.targets[0]) await c.sock.updateBlockStatus(c.targets[0],'block'); c.reply('BLOCKED'); });
add('unblock', {cat:'owner', owner:true}, async(c)=>{ if(c.targets[0]) await c.sock.updateBlockStatus(c.targets[0],'unblock'); c.reply('UNBLOCKED'); });
add('delete', {cat:'owner', owner:true}, async(c)=>{ const info=c.m.message?.extendedTextMessage?.contextInfo; if(info?.stanzaId) await c.sock.sendMessage(c.jid, {delete: {remoteJid: c.jid, fromMe: false, id: info.stanzaId, participant: info.participant}}); });
add('pair', {cat:'owner', owner:true}, (c)=>c.reply('PAIR: Use link'));
add('follow', {cat:'owner', owner:true}, (c)=>c.reply('FOLLOW Done'));
add('follow2', {cat:'owner', owner:true}, (c)=>c.reply('FOLLOW2 Done'));
add('unfollow', {cat:'owner', owner:true}, (c)=>c.reply('UNFOLLOW Done'));
add('unfollow2', {cat:'owner', owner:true}, (c)=>c.reply('UNFOLLOW2 Done'));
add('status', {cat:'owner', owner:true}, async(c)=>{ if(c.text) await c.sock.updateProfileStatus(c.text); c.reply('STATUS: '+c.text); });
add('status2', {cat:'owner', owner:true}, (c)=>c.reply('STATUS2 Done'));
add('fullpp', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}},{quoted:c.m}); }catch{ c.reply('No PP'); } });
add('getpp', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}},{quoted:c.m}); }catch{ c.reply('No PP'); } });
add('getimage', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}} ,{quoted:c.m}); }catch{ c.reply('No image'); } });
add('getbio', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; const bio=await c.sock.fetchStatus(j).catch(()=>null); c.reply('BIO: '+(bio?.status||'No bio')); });
add('mode', {cat:'owner', owner:true}, (c)=>{ settings.mode=c.args[0]||'public'; c.reply('MODE: '+settings.mode); });
add('antidelete', {cat:'owner', owner:true}, (c)=>{ settings.antidelete=c.args[0]==='on'; c.reply('ANTIDELETE: '+settings.antidelete); });
add('autostatus', {cat:'owner', owner:true}, (c)=>{ settings.autostatus=c.args[0]==='on'; c.reply('AUTOSTATUS: '+settings.autostatus); });
add('autoreact', {cat:'owner', owner:true}, (c)=>{ settings.autoreact=c.args[0]==='on'; c.reply('AUTOREACT: '+settings.autoreact); });
add('subhanallah', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('mashaallah', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('mashallah', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('ai', {cat:'ai'}, (c)=>c.reply('AI: '+c.text));
add('gpt', {cat:'ai'}, (c)=>c.reply('GPT: '+c.text));
add('imagine', {cat:'ai'}, (c)=>c.reply('IMAGINE: '+c.text));
add('gpt2', {cat:'ai'}, (c)=>c.reply('GPT2: '+c.text));
add('dalle', {cat:'ai'}, (c)=>c.reply('DALLE: '+c.text));
add('toimg', {cat:'ai'}, (c)=>c.reply('TOIMG: '+c.text));
add('google', {cat:'ai'}, (c)=>c.reply('GOOGLE: '+c.text));
add('weather', {cat:'ai'}, (c)=>c.reply('WEATHER: '+c.text));
add('news', {cat:'ai'}, (c)=>c.reply('NEWS: '+c.text));
add('translate', {cat:'ai'}, (c)=>c.reply('TRANSLATE: '+c.text));
add('sticker', {cat:'ai'}, (c)=>c.reply('STICKER: Send image'));
add('toaudio', {cat:'ai'}, (c)=>c.reply('TOAUDIO'));
add('tovideo', {cat:'ai'}, (c)=>c.reply('TOVIDEO'));
add('url', {cat:'ai'}, (c)=>c.reply('URL: '+c.text));
add('git', {cat:'ai'}, (c)=>c.reply('GIT: '+c.text));
add('repo', {cat:'ai'}, (c)=>c.reply('REPO: Shadow MD'));
add('vcard', {cat:'ai'}, (c)=>c.reply('VCARD: '+c.text));
add('ss', {cat:'ai'}, (c)=>c.reply('SS: '+c.text));
add('yta', {cat:'ai'}, (c)=>c.reply('YTA: '+c.text));
add('ytv', {cat:'ai'}, (c)=>c.reply('YTV: '+c.text));
add('igdl', {cat:'ai'}, (c)=>c.reply('IGDL: '+c.text));
add('fbdl', {cat:'ai'}, (c)=>c.reply('FBDL: '+c.text));
add('ttdl', {cat:'ai'}, (c)=>c.reply('TTDL: '+c.text));
add('antilink', {cat:'ai'}, (c)=>c.reply('ANTILINK'));
add('welcome', {cat:'ai'}, (c)=>c.reply('WELCOME ON'));
add('goodbye', {cat:'ai'}, (c)=>c.reply('GOODBYE ON'));
add('promote2', {cat:'ai'}, (c)=>c.reply('PROMOTE2'));
add('demote2', {cat:'ai'}, (c)=>c.reply('DEMOTE2'));
add('kickall', {cat:'ai'}, (c)=>c.reply('KICKALL'));
add('tagall2', {cat:'ai'}, (c)=>c.reply('TAGALL2'));
add('hidetag2', {cat:'ai'}, (c)=>c.reply('HIDETAG2'));
add('listonline', {cat:'ai'}, async(c)=>{ const meta=await c.getMeta(); c.reply('ONLINE: '+meta.participants.length); });
add('gclink', {cat:'ai'}, async(c)=>{ const code=await c.sock.groupInviteCode(c.jid); c.reply('https://chat.whatsapp.com/'+code); });
add('setpp', {cat:'ai'}, (c)=>c.reply('SETPP: Send image'));
add('setdesc', {cat:'ai'}, async(c)=>{ await c.sock.groupUpdateDescription(c.jid, c.text); c.reply('Desc set'); });
add('setname', {cat:'ai'}, async(c)=>{ await c.sock.groupUpdateSubject(c.jid, c.text); c.reply('Name set'); });
add('mute', {cat:'ai'}, async(c)=>{ await c.sock.groupSettingUpdate(c.jid, 'announcement'); c.reply('Muted'); });
add('unmute', {cat:'ai'}, async(c)=>{ await c.sock.groupSettingUpdate(c.jid, 'not_announcement'); c.reply('Unmuted'); });
add('open', {cat:'ai'}, async(c)=>{ await c.sock.groupSettingUpdate(c.jid, 'not_announcement'); c.reply('Group Opened'); });
add('close', {cat:'ai'}, async(c)=>{ await c.sock.groupSettingUpdate(c.jid, 'announcement'); c.reply('Group Closed'); });
add('lock', {cat:'ai'}, async(c)=>{ await c.sock.groupSettingUpdate(c.jid, 'locked'); c.reply('Locked'); });
add('unlock', {cat:'ai'}, async(c)=>{ await c.sock.groupSettingUpdate(c.jid, 'unlocked'); c.reply('Unlocked'); });

export const totalCommands = ()=> list.length;

export async function handleMessage(sock, m){
  const jid = m.key?.remoteJid; if(!jid || !m.message) return;
  const content = normalizeMessageContent ? normalizeMessageContent(m.message) : m.message;
  let text = (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || '').trim();
  if(!text) return;
  const senderNum = jidNormalizedUser(m.key.participant || jid).split('@')[0];
  const myNum = jidNormalizedUser(sock.user.id).split('@')[0];
  const ownerNums = (process.env.OWNER_NUMBER || settings.ownerNumber).split(',').map(x=>x.trim());
  const isOwner = m.key.fromMe || ownerNums.includes(senderNum) || senderNum === settings.ownerNumber || senderNum === myNum;
  const lower = text.toLowerCase();
  if(isOwner && OWNER_VV_KEYWORDS.includes(lower)){
    const ctx = content?.extendedTextMessage?.contextInfo;
    const q = ctx?.quotedMessage;
    if(q){
      const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessageV2Extension?.message || q;
      const inner = Object.values(vo)[0] || vo;
      if(inner?.imageMessage) { await sock.sendMessage(jid, {image: inner.imageMessage, caption: lower.toUpperCase()}, {quoted: m}).catch(()=>{}); return; }
      if(inner?.videoMessage) { await sock.sendMessage(jid, {video: inner.videoMessage}, {quoted: m}).catch(()=>{}); return; }
      if(inner?.audioMessage) { await sock.sendMessage(jid, {audio: inner.audioMessage, ptt:true}, {quoted: m}).catch(()=>{}); return; }
    }
  }
  if(!text.startsWith(settings.prefix)) return;
  const [rawName, ...args] = text.slice(1).trim().split(/\s+/);
  const cmd = commands.get(rawName.toLowerCase());
  if(!cmd) return;
  if(cmd.owner && !isOwner) return sock.sendMessage(jid, {text: 'ONLY OWNER'}, {quoted: m}).catch(()=>{});
  const reply = (t)=> sock.sendMessage(jid, {text: String(t)}, {quoted: m}).catch(()=>sock.sendMessage(jid, {text: String(t)}));
  let metaCache=null; const getMeta=async()=>(metaCache ||= jid.endsWith('@g.us') ? await sock.groupMetadata(jid) : null);
  const info = content?.extendedTextMessage?.contextInfo || {};
  let targets = info.mentionedJid?.length ? info.mentionedJid : info.participant ? [info.participant] : [];
  if(!targets.length) targets = args.map(a=>a.replace(/\D/g,'')).filter(a=>a.length>=8).map(n=>n+'@s.whatsapp.net');
  const c = {sock,m,jid,args,text:args.join(' '), isGroup:jid.endsWith('@g.us'), isOwner, reply, getMeta, targets, content, prefix: settings.prefix};
  try{ await cmd.run(c); }catch(e){ console.log('CMD ERR', e.message); }
}

export default handleMessage;