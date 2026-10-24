import * as baileys from '@whiskeysockets/baileys';
const B = (k) => baileys[k] ?? baileys.default?.[k];
const jidNormalizedUser = B('jidNormalizedUser') ?? ((j) => (j || '').replace(/:\d+@/, '@'));
const normalizeMessageContent = B('normalizeMessageContent');

export const settings = {
  prefix: '.', mode: 'public', version: '4.2 FINAL FIX',
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
  const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessageV2Extension?.message;
  if(!vo) return c.reply(`❌ One Time ko Reply karke likho: Subhanallah, MashaAllah, Ok, Nice, Rana etc`);
  const inner = Object.values(vo)[0];
  if(inner?.imageMessage) await c.sock.sendMessage(c.jid, {image: inner.imageMessage, caption: `*${c.text.toUpperCase()}*`}, {quoted: c.m});
  else if(inner?.videoMessage) await c.sock.sendMessage(c.jid, {video: inner.videoMessage, caption: `*${c.text.toUpperCase()}*`}, {quoted: c.m});
  else if(inner?.audioMessage) await c.sock.sendMessage(c.jid, {audio: inner.audioMessage, ptt:true}, {quoted: c.m});
}

add('menu', {cat:'general', alias:['help']}, async(c)=>{
  let out = `╭━━〔 *SHADOW MD MINI 150* 〕━━┈⊷\n┃ OWNER: RANA FURQAN 923003719761\n┃ CMDS: ${list.length}\n┃ RUN: ${fmtTime(Date.now()-startedAt)}\n╰━━━━━━━━━━┈⊷\n`;
  const cats = {general:'GENERAL', fun:'FUN', downloader:'DOWNLOADER', group:'GROUP', owner:'OWNER', ai:'AI'};
  for(const [k,label] of Object.entries(cats)){
    const items = list.filter(x=>x.cat===k);
    if(!items.length) continue;
    out+=`\n╭━━〔 ${label} 〕━━┈⊷\n`+items.map(x=>`┋ ◇ ${x.name.toUpperCase()}`).join('\n')+`\n╰━━━━━━━━━━┈⊷\n`;
  }
  await sendPic(c.sock,c.jid,out,c.m);
});

// OWNER - AAPKE BATAYE HUE
add('vv3', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('vv', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('vv2', {cat:'owner', owner:true}, async(c)=> handleVV(c));
add('getbio', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; const bio=await c.sock.fetchStatus(j).catch(()=>null); c.reply(`BIO: ${bio?.status||'No bio'}`); });
add('getpp', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}},{quoted:c.m}); }catch{ c.reply('No PP'); } });
add('getimage', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}} ,{quoted:c.m}); }catch{ c.reply('No image'); } });
add('fullpp', {cat:'owner', owner:true}, async(c)=>{ const j=c.targets[0]||c.jid; try{ const url=await c.sock.profilePictureUrl(j,'image'); await c.sock.sendMessage(c.jid,{image:{url}, caption:`FULLPP`},{quoted:c.m}); }catch{ c.reply('No PP'); } });
add('block', {cat:'owner', owner:true}, async(c)=>{ if(c.targets[0]) await c.sock.updateBlockStatus(c.targets[0],'block'); c.reply('BLOCKED ✅'); });
add('unblock', {cat:'owner', owner:true}, async(c)=>{ if(c.targets[0]) await c.sock.updateBlockStatus(c.targets[0],'unblock'); c.reply('UNBLOCKED ✅'); });
add('status', {cat:'owner', owner:true}, async(c)=>{ if(c.text) await c.sock.updateProfileStatus(c.text); c.reply(`STATUS: ${c.text}`); });
add('forward', {cat:'owner', owner:true}, (c)=>c.reply('Reply to msg for forward'));
add('leave', {cat:'owner', owner:true}, async(c)=>{ await c.sock.groupLeave(c.jid); });
add('hidetag', {cat:'owner', owner:true}, async(c)=>{ const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:c.text||'HIDETAG', mentions:meta.participants.map(p=>p.id)}); });
add('mode', {cat:'owner', owner:true}, (c)=>{ settings.mode=c.args[0]||'public'; c.reply(`MODE: ${settings.mode}`); });
add('antidelete', {cat:'owner', owner:true}, (c)=>{ const v=c.args[0]; settings.antidelete=v==='on'; c.reply(`ANTIDELETE: ${settings.antidelete?'ON':'OFF'}`); });
OWNER_VV_KEYWORDS.forEach(kw=>{ if(!commands.has(kw)) add(kw, {cat:'owner', owner:true}, async(c)=> handleVV(c)); });

// GROUP - AAPKE SCREENSHOT WALE
add('tagall', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:`TAGALL`, mentions:meta.participants.map(p=>p.id)}, {quoted:c.m}); });
add('kick', {cat:'group'}, async(c)=>{ if(c.targets.length) await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'remove'); });
add('promote', {cat:'group'}, async(c)=>{ await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'promote'); c.reply('Promoted'); });
add('demote', {cat:'group'}, async(c)=>{ await c.sock.groupParticipantsUpdate(c.jid, c.targets, 'demote'); c.reply('Demoted'); });
add('link', {cat:'group'}, async(c)=>{ const code=await c.sock.groupInviteCode(c.jid); c.reply(`https://chat.whatsapp.com/${code}`); });
add('ginfo', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); c.reply(`GINFO: ${meta.subject} - ${meta.participants.length}`); });
add('tag', {cat:'group'}, async(c)=>{ const meta=await c.getMeta(); await c.sock.sendMessage(c.jid,{text:c.text||'Hi', mentions:meta.participants.map(p=>p.id)}); });

// GENERAL
add('ping', {cat:'general'}, async(c)=>{ console.log('PING EXECUTED'); await c.reply('PONG! ✅ BOT WORKING - 150 CMDS - RANA FURQAN'); });
add('alive', {cat:'general'}, async(c)=>{ await sendPic(c.sock,c.jid,'*ALIVE ✅ 150 CMDS*',c.m); });
add('runtime', {cat:'general'}, (c)=>c.reply(fmtTime(Date.now()-startedAt)));
add('owner', {cat:'general'}, (c)=>c.reply('OWNER: 923003719761'));

// DOWNLOADER PUBLIC
add('video', {cat:'downloader'}, (c)=>c.reply(`VIDEO: ${c.text}`));
add('play', {cat:'downloader'}, (c)=>c.reply(`PLAY: ${c.text}`));
add('drama', {cat:'downloader'}, (c)=>c.reply(`DRAMA: ${c.text}`));
add('cartoon', {cat:'downloader'}, (c)=>c.reply(`CARTOON: ${c.text}`));
add('joke', {cat:'downloader'}, (c)=>c.reply('JOKE 😂'));
add('song', {cat:'downloader'}, (c)=>c.reply(`SONG: ${c.text}`));
add('yt', {cat:'downloader'}, (c)=>c.reply(`YT: ${c.text}`));
add('tiktok', {cat:'downloader'}, (c)=>c.reply(`TIKTOK: ${c.text}`));
add('insta', {cat:'downloader'}, (c)=>c.reply(`INSTA: ${c.text}`));
add('fb', {cat:'downloader'}, (c)=>c.reply(`FB: ${c.text}`));

// AI
add('ai', {cat:'ai'}, (c)=>c.reply(`AI: ${c.text}`));

export const totalCommands = ()=> list.length;

export async function handleMessage(sock, m){
  const jid = m.key?.remoteJid; if(!jid || !m.message) return;
  const content = normalizeMessageContent ? normalizeMessageContent(m.message) : m.message;
  let text = (content?.conversation || content?.extendedTextMessage?.text || content?.imageMessage?.caption || content?.videoMessage?.caption || '').trim();
  if(!text) return;
  console.log(`[MSG] ${jid} => ${text}`);
  const senderNum = jidNormalizedUser(m.key.participant || jid).split('@')[0];
  const myNum = jidNormalizedUser(sock.user.id).split('@')[0];
  const ownerNums = (process.env.OWNER_NUMBER || settings.ownerNumber).split(',').map(x=>x.trim());
  const isOwner = m.key.fromMe || ownerNums.includes(senderNum) || senderNum === settings.ownerNumber || senderNum === myNum;
  const lower = text.toLowerCase();
  if(isOwner && OWNER_VV_KEYWORDS.includes(lower)){
    const q = content?.extendedTextMessage?.contextInfo?.quotedMessage;
    if(q){
      const vo = q?.viewOnceMessage?.message || q?.viewOnceMessageV2?.message || q?.viewOnceMessageV2Extension?.message;
      if(vo){
        const inner = Object.values(vo)[0];
        if(inner?.imageMessage) { await sock.sendMessage(jid, {image: inner.imageMessage, caption: `*${text.toUpperCase()}*`}, {quoted: m}); return; }
        if(inner?.videoMessage) { await sock.sendMessage(jid, {video: inner.videoMessage}, {quoted: m}); return; }
        if(inner?.audioMessage) { await sock.sendMessage(jid, {audio: inner.audioMessage, ptt:true}, {quoted: m}); return; }
      }
    }
  }
  if(!text.startsWith(settings.prefix)) return;
  const [rawName, ...args] = text.slice(1).trim().split(/\s+/);
  const cmd = commands.get(rawName.toLowerCase());
  if(!cmd){ console.log('CMD NOT FOUND', rawName); return; }
  if(cmd.owner && !isOwner) return sock.sendMessage(jid, {text: `❌ ONLY OWNER`}, {quoted: m});
  const reply = (t)=> sock.sendMessage(jid, {text: String(t)}, {quoted: m});
  let metaCache=null; const getMeta=async()=>(metaCache ||= jid.endsWith('@g.us') ? await sock.groupMetadata(jid) : null);
  const info = content?.extendedTextMessage?.contextInfo || {};
  let targets = info.mentionedJid?.length ? info.mentionedJid : info.participant ? [info.participant] : [];
  if(!targets.length) targets = args.map(a=>a.replace(/\D/g,'')).filter(a=>a.length>=8).map(n=>n+'@s.whatsapp.net');
  const c = {sock,m,jid,args,text:args.join(' '), isGroup:jid.endsWith('@g.us'), isOwner, reply, getMeta, targets, content, prefix: settings.prefix};
  try{ console.log('EXEC CMD', cmd.name); await cmd.run(c); }catch(e){ console.log('CMD ERR', e.message); }
}

// Default bhi export karo taake purana handler bhi kaam kare
export default handleMessage;