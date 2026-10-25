import { jidNormalizedUser } from '@whiskeysockets/baileys';
import store, { cache, cacheMsg } from '../lib/store.js';
import config from '../config.js';
import * as U from '../lib/utils.js';
import { ai } from '../lib/api.js';

const REACTS = ['❤️', '😍', '🔥', '👍', '😂', '🥰', '✨', '🌹', '😊', '💯'];
const KEYWORDS = new Set(config.keywords.map((k) => k.toLowerCase()));

// kisi bhi message (media/text) ki copy owner ko bhejta hai
async function sendCopy(sock, to, msg, header) {
  const inner = U.findViewOnce(msg.message) || U.unwrap(msg.message);
  const md = await U.downloadMedia(inner).catch(() => null);
  if (md) { await U.sendMedia(sock, to, md, header); return true; }
  const text = U.textOf(inner);
  if (text) { await sock.sendMessage(to, { text: `${header}\n\n${text}` }); return true; }
  try { await sock.sendMessage(to, { text: header }); await sock.sendMessage(to, { forward: msg }); return true; } catch { return false; }
}

async function chatName(sock, jid) {
  if (!jid.endsWith('@g.us')) return 'Private chat';
  try { return (await U.getMeta(sock, jid)).subject; } catch { return 'Group'; }
}

// true return ho to handler aage command check nahi karta
export async function preProcess(sock, m, c) {
  cacheMsg(m);
  const { jid, fromMe, isGroup, sender, inner, body, isOwner, botId } = c;

  /* ---- STATUS ---- */
  if (jid === 'status@broadcast') {
    if (fromMe) return true;
    if (store.get('statusview')) await sock.readMessages([m.key]).catch(() => {});
    if (store.get('statusreact')) {
      const who = m.key.participant ? jidNormalizedUser(m.key.participant) : null;
      await sock.sendMessage('status@broadcast',
        { react: { key: m.key, text: store.get('statusEmoji') || '❤️' } },
        { statusJidList: [who, botId].filter(Boolean) }).catch(() => {});
    }
    return true;
  }

  /* ---- ANTI DELETE (delete hua message owner ke personal chat mein) ---- */
  const pm = inner.protocolMessage;
  if (pm && pm.type === 0) {
    if (!store.get('antidelete') || fromMe) return true;
    const orig = cache.get(pm.key?.id);
    if (!orig || orig.key.fromMe) return true;
    const who = U.num(orig.key.participant || orig.key.remoteJid);
    const header = `🗑️ *ANTI DELETE*\n👤 wa.me/${who}\n💬 ${await chatName(sock, jid)}`;
    await sendCopy(sock, U.ownerJid(), orig, header);
    return true;
  }
  if (pm) return true;

  /* ---- ANTI VIEW-ONCE (aane wali view-once owner ke personal chat mein) ---- */
  if (!fromMe && store.get('antiviewonce') && U.findViewOnce(m.message)) {
    const header = `👁️ *VIEW ONCE*\n👤 wa.me/${U.num(sender)}\n💬 ${await chatName(sock, jid)}`;
    sendCopy(sock, U.ownerJid(), m, header).catch(() => {});
  }

  /* ---- KEYWORD SAVE: owner view-once/status par "cute", "RANA" etc. likhe ---- */
  if ((fromMe || isOwner) && body && KEYWORDS.has(body.trim().toLowerCase())) {
    const q = U.getQuoted(m);
    if (q && (q.viewOnce || q.isStatus)) {
      const who = U.num(q.participant || jid);
      const fake = { key: { remoteJid: jid, participant: q.participant }, message: q.raw };
      sendCopy(sock, U.ownerJid(), fake, `💾 *SAVED ${q.isStatus ? 'STATUS' : 'VIEW ONCE'}*\n👤 wa.me/${who}`).catch(() => {});
    }
  }

  /* ---- Presence / reactions ---- */
  if (!fromMe) {
    if (store.get('autorecording')) sock.sendPresenceUpdate('recording', jid).catch(() => {});
    else if (store.get('autotyping')) sock.sendPresenceUpdate('composing', jid).catch(() => {});
    if (store.get('autoreact') && body && Math.random() < 0.5)
      sock.sendMessage(jid, { react: { text: U.pick(REACTS), key: m.key } }).catch(() => {});
  }

  /* ---- GROUP: antilink / antistatus ---- */
  if (isGroup && !fromMe && !isOwner) {
    const link = store.sub('antilink', jid);
    const st = store.sub('antistatus', jid);
    const isStatusMention = !!(inner.groupStatusMentionMessage || inner.statusMentionMessage || inner.groupMentionedMessage);
    if ((link && link !== 'off') || (st && isStatusMention)) {
      let admins = [];
      try { admins = U.adminsOf(await U.getMeta(sock, jid)); } catch {}
      if (admins.includes(botId) && !admins.includes(sender)) {
        const re = link === 'all' ? /(https?:\/\/|www\.)\S+/i : /chat\.whatsapp\.com\/[A-Za-z0-9]+/i;
        if (st && isStatusMention) {
          await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
          await sock.sendMessage(jid, { text: `🚫 @${U.num(sender)} group status mention allowed nahi hai!`, mentions: [sender] });
          return true;
        }
        if (link && link !== 'off' && body && re.test(body)) {
          await sock.sendMessage(jid, { delete: m.key }).catch(() => {});
          await sock.sendMessage(jid, { text: `🚫 @${U.num(sender)} link bhejna mana hai!`, mentions: [sender] });
          if (link === 'kick') await sock.groupParticipantsUpdate(jid, [sender], 'remove').catch(() => {});
          return true;
        }
      }
    }
  }

  /* ---- CHATBOT (sirf private chat) ---- */
  if (!isGroup && !fromMe && store.get('chatbot') && body && !body.startsWith(c.prefix)) {
    sock.sendPresenceUpdate('composing', jid).catch(() => {});
    const r = await ai(body).catch(() => null);
    if (r) await sock.sendMessage(jid, { text: r }, { quoted: m });
    return true;
  }

  return false;
}