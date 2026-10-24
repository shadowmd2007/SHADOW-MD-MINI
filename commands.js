import * as baileys from '@whiskeysockets/baileys';
const B = (k) => baileys[k] ?? baileys.default?.[k];
const jidNormalizedUser = B('jidNormalizedUser') ?? ((j) => (j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent');

export const settings = {
  prefix: '.', mode: 'public', version: '4.0 FINAL GROUP',
  botName: 'Shadow MD Mini', ownerName: 'Rana Furqan Rajput',
  ownerNumber: process.env.OWNER_NUMBER || '923003719761',
  picUrl: 'https://i.ibb.co/zhHMv7FM/file-00000000842482109e9c8ceae82aa6f8.png',
  antidelete: false, autostatus: false, autoreact: false, autotyping: false, autorecording: false, chatbot: false,
};

const OWNER_VV_KEYWORDS = ['subhanallah','mashaallah','mashallah','vv2','vv3','ok','nice','rana','beautiful','best','wah','lajawab','handsome','cute'];
const startedAt = Date.now();
let picBuf = null;
async function getPic(){ if(picBuf) return picBuf; try{ const r=await fetch(settings.picUrl); picBuf=Buffer.from(await r.arrayBuffer()); }catch{} return picBuf; }
export async function sendPic(sock,jid,caption,quoted){ const buf=await getPic(); if(buf){ try{ return await sock.sendMessage(jid,{image:buf,caption},{quoted}); }catch{} } return sock.sendMessage(jid,{text:caption},{quoted}); }
const fmtTime = (ms)=>{ const s=Math.floor(ms/1000); return `${Math.floor(s/86400)}d ${Math.floor((s%86400)/3600)}h ${Math.floor((s%3600)/60)}m ${s%60}s`; };
const commands = new Map(); const list = []; export const commandsList = list;
function add(name, opts, run){ const c={name, cat:'general', alias:[], ...opts, run}; list.push(c); commands.set(name,c); c.alias.forEach(a=>commands.set(a,c)); }
async function handleVV(c){
  const q = c.m.message?.extendedTextMessage?.contextInfo?.quotedMessage;
  const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message;
  if(!vo) return c.reply(`❌ Reply to One Time Pic/Video then type: ${c.text}`);
  const inner = Object.values(vo)[0];
  if(inner?.imageMessage) await c.sock.sendMessage(c.jid, {image: inner.imageMessage, caption: `*${c.text.toUpperCase()}*`}, {quoted: c.m});
  else if(inner?.videoMessage) await c.sock.sendMessage(c.jid, {video: inner.videoMessage}, {quoted: c.m});
  else if(inner?.audioMessage) await c.sock.sendMessage(c.jid, {audio: inner.audioMessage, ptt:true}, {quoted: c.m});
}

// MENU
add('menu', {cat:'general', alias:['help']}, async(c)=>{
  let out = `╭━━〔 *SHADOW MD MINI* 〕━━┈⊷\n┃ OWNER: RANA FURQAN RAJPUT\n┃ NUM: 923003719761\n┃ CMDS: ${list.length}\n┃ RUN: ${fmtTime(Date.now()-startedAt)}\n╰━━━━━━━━━━┈⊷\n`;
  const cats = {general:'GENERAL', fun:'FUN', downloader:'DOWNLOADER', group:'GROUP', owner:'OWNER', ai:'AI'};
  for(const [k,label] of Object.entries(cats)){
    const items = list.filter(x=>x.cat===k);
    out+=`\n╭━━〔 ${label} 〕━━┈⊷\n`+items.map(x=>`┋ ◇ ${x.name.toUpperCase()}`).join('\n')+`\n╰━━━━━━━━━━┈⊷\n`;
  }
  await sendPic(c.sock,c.jid,out,c.m);
});

// ========== GROUP SECTION - AAPKE SCREENSHOT WALE ==========
add('tagall', {cat:'group'}, async(c)=>{ if(!c.isGroup) return c.reply('GROUP ONLY'); const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:`*TAGALL:*\n`+meta.participants.map(p=>'@'+p.id.split('@')[0]).join('\n'), mentions:meta.participants.map(p=>p.id)}, {quoted:c.m}); });
add('kick', {cat:'group'}, async(c)=>{ if(!c.isGroup) return; if(!c.targets.length) return c.reply('Mention karo'); await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'remove').catch(()=>c.reply('Admin nahi hun')); });
add('promote', {cat:'group'}, async(c)=>{ if(!c.isGroup) return; await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'promote'); c.reply('Promoted'); });
add('demote', {cat:'group'}, async(c)=>{ if(!c.isGroup) return; await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'demote'); c.reply('Demoted'); });
add('gcpp', {cat:'group', alias:['gcpp','setppgc','gcsetpp']}, async(c)=>{ c.reply('Send image with .gcpp to set group pic'); });
add('revoke', {cat:'group'}, async(c)=>{ if(!c.isGroup) return; await c.sock.groupRevokeInvite(c.jid); c.reply('Link revoked ✅'); });
add('link', {cat:'group', alias:['gclink']}, async(c)=>{ if(!c.isGroup) return; const code=await c.sock.groupInviteCode(c.jid); c.reply(`https://chat.whatsapp.com/${code}`); });
add('ginfo', {cat:'group', alias:['groupinfo']}, async(c)=>{ if(!c.isGroup) return; const meta=await c.getMeta(); c.reply(`*GINFO:*\nName: ${meta.subject}\nMembers: ${meta.participants.length}\nAdmins: ${meta.participants.filter(p=>p.admin).length}`); });
add('updatedgdesc', {cat:'group', alias:['updatedesc','setgdesc']}, async(c)=>{ if(!c.isGroup) return; await c.sock.groupUpdateDescription(c.jid, c.text); c.reply('Desc updated'); });
add('updatengname', {cat:'group', alias:['updategname','setgname']}, async(c)=>{ if(!c.isGroup) return; await c.sock.groupUpdateSubject(c.jid, c.text); c.reply('Name updated'); });
add('poll', {cat:'group'}, async(c)=>{ await c.sock.sendMessage(c.jid, {poll: {name: c.text||'POLL', values: ['Yes','No'], selectableCount: 1}}); });
add('out', {cat:'group', alias:['leave']}, async(c)=>{ await c.sock.groupLeave(c.jid); });
add('newgc', {cat:'group', alias:['creategc']}, async(c)=>{ if(!c.text) return c.reply('Name do .newgc MyGroup'); await c.sock.groupCreate(c.text, [c.sender]); c.reply('Group created'); });
add('end', {cat:'group'}, (c)=>c.reply('END'));
add('join', {cat:'group', owner:true}, async(c)=>{ if(!c.text) return c.reply('Link do .join https://chat.whatsapp.com/...'); await c.sock.groupAcceptInvite(c.text.split('/').pop()); c.reply('Joined'); });
add('invite', {cat:'group'}, async(c)=>{ if(!c.isGroup || !c.targets[0]) return; const code=await c.sock.groupInviteCode(c.jid); await c.sock.sendMessage(c.targets[0], {text: `https://chat.whatsapp.com/${code}`}); c.reply('Invite sent'); });
add('tag', {cat:'group', alias:['hidetag']}, async(c)=>{ const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:c.text||'TAG', mentions:meta.participants.map(p=>p.id)}); });
add('acceptall', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); const reqs=await c.sock.groupRequestParticipantsList(c.jid).catch(()=>[]); for(const r of reqs) await c.sock.groupRequestParticipantsUpdate(c.jid, [r.jid], 'approve'); c.reply('All accepted'); });
add('rejectall', {cat:'group'}, async(c)=>{ const reqs=await c.sock.groupRequestParticipantsList(c.jid).catch(()=>[]); for(const r of reqs) await c.sock.groupRequestParticipantsUpdate(c.jid, [r.jid], 'reject'); c.reply('All rejected'); });
add('requests', {cat:'group', alias:['req']}, async(c)=>{ const reqs=await c.sock.groupRequestParticipantsList(c.jid).catch(()=>[]); c.reply(`REQUESTS: ${reqs.length}\n`+reqs.map(r=>r.jid.split('@')[0]).join('\n')); });
add('accept', {cat:'group'}, async(c)=>{ if(!c.targets[0]) return; await c.sock.groupRequestParticipantsUpdate(c.jid, c.targets, 'approve'); });
add('reject', {cat:'group'}, async(c)=>{ if(!c.targets[0]) return; await c.sock.groupRequestParticipantsUpdate(c.jid, c.targets, 'reject'); });
add('add', {cat:'group'}, async(c)=>{ if(!c.args[0]) return c.reply('Number do'); await c.sock.groupParticipantsUpdate(c.jid, [c.args[0].replace(/\D/g,'')+'@s.whatsapp.net'], 'add'); });
add('gcstatus2', {cat:'group'}, (c)=>c.reply('GCSTATUS2: Group open'));
add('gcstatus', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); c.reply(`GCSTATUS: ${meta.announce?'Closed':'Open'}`); });
add('del', {cat:'group', alias:['delete']}, async(c)=>{ const info=c.m.message?.extendedTextMessage?.contextInfo; if(!info?.stanzaId) return c.reply('Reply to msg'); await c.sock.sendMessage(c.jid, {delete: {remoteJid: c.jid, fromMe: false, id: info.stanzaId, participant: info.participant}}); });
add('chreact', {cat:'group'}, async(c)=>{ await c.sock.sendMessage(c.jid, {react: {text: c.args[0]||'❤️', key: c.m.key}}); });
add('chreact2', {cat:'group'}, async(c)=>{ await c.sock.sendMessage(c.jid, {react: {text: c.args[0]||'🔥', key: c.m.key}}); });

// ========== OWNER SECTION ==========
add('vv', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('vv2', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('vv3', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('getbio', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; const bio=await c.sock.fetchStatus(j).catch(()=>null); c.reply(`BIO: ${bio?.status||'No bio'}`); });
add('getpp', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}},{quoted:c.m}); }catch{ c.reply('No PP'); } });
add('getimage', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}} ,{quoted:c.m}); }catch{ c.reply('No image'); } });
add('fullpp', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}, caption:`FULLPP`},{quoted:c.m}); }catch{ c.reply('No PP'); } });
add('block', {cat:'owner', owner:true}, async(c)=>{ if(c.targets[0]) await c.sock.updateBlockStatus(c.targets[0],'block'); c.reply('BLOCKED'); });
add('unblock', {cat:'owner', owner:true}, async(c)=>{ if(c.targets[0]) await c.sock.updateBlockStatus(c.targets[0],'unblock'); c.reply('UNBLOCKED'); });
add('status', {cat:'owner', owner:true}, async(c)=>{ if(c.text) await c.sock.updateProfileStatus(c.text); c.reply(`STATUS: ${c.text}`); });
add('status2', {cat:'owner', owner:true}, (c)=>c.reply('STATUS2 Done'));
add('forward', {cat:'owner', owner:true}, (c)=>c.reply('Forward by reply'));
add('follow', {cat:'owner', owner:true}, (c)=>c.reply('FOLLOW Done'));
add('pair', {cat:'owner', owner:true}, (c)=>c.reply('PAIR: /pair?number=...'));
OWNER_VV_KEYWORDS.forEach(kw=>{ if(!commands.has(kw)) add(kw, {cat:'owner', owner:true}, async(c)=> handleVV(c)); });

// OWNER EXTRA
add('mode', {cat:'owner', owner:true}, (c)=>{ settings.mode=c.args[0]||'public'; c.reply(`MODE: ${settings.mode}`); });
add('antidelete', {cat:'owner', owner:true}, (c)=>{ settings.antidelete=c.args[0]==='on'; c.reply(`ANTIDELETE: ${settings.antidelete}`); });

// DOWNLOADER - PUBLIC - HAR KOI USE KAR SAKTA
add('video', {cat:'downloader'}, (c)=>c.reply(`VIDEO: ${c.text}`));
add('play', {cat:'downloader'}, (c)=>c.reply(`PLAY: ${c.text}`));
add('drama', {cat:'downloader'}, (c)=>c.reply(`DRAMA: ${c.text}`));
add('cartoon', {cat:'downloader'}, (c)=>c.reply(`CARTOON: ${c.text}`));
add('joke', {cat:'downloader'}, (c)=>c.reply(`JOKE: Why chicken crossed road?`));
add('song', {cat:'downloader'}, (c)=>c.reply(`SONG: ${c.text}`));
add('yt', {cat:'downloader'}, (c)=>c.reply(`YT: ${c.text}`));
add('tiktok', {cat:'downloader'}, (c)=>c.reply(`TIKTOK: ${c.text}`));
add('insta', {cat:'downloader'}, (c)=>c.reply(`INSTA: ${c.text}`));
add('fb', {cat:'downloader'}, (c)=>c.reply(`FB: ${c.text}`));
add('apk', {cat:'downloader'}, (c)=>c.reply(`APK: ${c.text}`));

// GENERAL
add('ping', {cat:'general'}, (c)=>c.reply('PONG!'));
add('alive', {cat:'general'}, (c)=>sendPic(c.sock,c.jid,'ALIVE ✅',c.m));
add('owner', {cat:'general'}, (c)=>c.reply('OWNER: 923003719761'));
add('ai', {cat:'ai'}, (c)=>c.reply(`AI: ${c.text}`));

export const totalCommands = ()=> list.length;
export async function handleMessage(sock, m){
  const jid = m.key?.remoteJid; if(!jid || !m.message) return; if(m.key.fromMe) return;
  const content = normalizeMessageContent ? normalizeMessageContent(m.message) : m.message;
  let text = (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || '').trim(); if(!text) return;
  const senderNum = jidNormalizedUser(m.key.participant || jid).split('@')[0];
  const isOwner = (process.env.OWNER_NUMBER || settings.ownerNumber).split(',').map(x=>x.trim()).includes(senderNum) || senderNum === settings.ownerNumber;
  const lower = text.toLowerCase();
  if(isOwner && OWNER_VV_KEYWORDS.includes(lower)){
    const q = content?.extendedTextMessage?.contextInfo?.quotedMessage;
    if(q){ const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message; if(vo){ const inner=Object.values(vo)[0]; if(inner?.imageMessage) { await sock.sendMessage(jid, {image: inner.imageMessage, caption: `*${text.toUpperCase()}*`}, {quoted: m}); return; } if(inner?.videoMessage) { await sock.sendMessage(jid, {video: inner.videoMessage}, {quoted: m}); return; } if(inner?.audioMessage) { await sock.sendMessage(jid, {audio: inner.audioMessage, ptt:true}, {quoted: m}); return; } } }
  }
  if(!text.startsWith(settings.prefix)) return;
  const [rawName, ...args] = text.slice(1).trim().split(/\s+/); const cmd = commands.get(rawName.toLowerCase()); if(!cmd) return;
  if(cmd.owner && !isOwner) return sock.sendMessage(jid, {text: `❌ ONLY OWNER\nRana Furqan Rajput 923003719761`}, {quoted: m});
  const reply = (t)=> sock.sendMessage(jid, {text: String(t)}, {quoted: m});
  let metaCache=null; const getMeta=async()=>(metaCache ||= jid.endsWith('@g.us') ? await sock.groupMetadata(jid) : null);
  const info = content?.extendedTextMessage?.contextInfo || {}; let targets = info.mentionedJid?.length ? info.mentionedJid : info.participant ? [info.participant] : [];
  if(!targets.length) targets = args.map(a=>a.replace(/\D/g,'')).filter(a=>a.length>=8).map(n=>n+'@s.whatsapp.net');
  const c = {sock,m,jid,args,text:args.join(' '), isGroup:jid.endsWith('@g.us'), isOwner, reply, getMeta, targets, content};
  try{ await cmd.run(c); }catch(e){ console.log(e.message); }
}