import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFile } from 'child_process';
import { downloadContentFromMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import config from '../config.js';

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const num = (jid) => String(jid || '').split('@')[0].split(':')[0];
export const toJid = (n) => String(n).replace(/\D/g, '') + '@s.whatsapp.net';
export const ownerJid = () => toJid(config.ownerNumber);

export function runtime(sec) {
  sec = Math.floor(sec);
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${d ? d + 'd ' : ''}${h}h ${m}m ${s}s`;
}

export function decodeHtml(s = '') {
  return String(s).replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&eacute;/g, 'é').replace(/&ldquo;|&rdquo;/g, '"').replace(/&rsquo;/g, "'");
}

/* ---------- message unwrap ---------- */
const WRAP = ['ephemeralMessage', 'documentWithCaptionMessage', 'editedMessage'];
const VO = ['viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'];

export function unwrap(message, { vo = true } = {}) {
  let m = message;
  for (let i = 0; i < 6 && m; i++) {
    const k = [...WRAP, ...(vo ? VO : [])].find((x) => m[x]);
    if (!k) break;
    m = m[k].message || m[k];
  }
  return m || {};
}

export function textOf(inner) {
  if (!inner) return '';
  return inner.conversation
    || inner.extendedTextMessage?.text
    || inner.imageMessage?.caption
    || inner.videoMessage?.caption
    || inner.documentMessage?.caption
    || inner.buttonsResponseMessage?.selectedButtonId
    || inner.listResponseMessage?.singleSelectReply?.selectedRowId
    || inner.templateButtonReplyMessage?.selectedId
    || '';
}

export function getCI(inner) {
  if (!inner) return null;
  for (const k of Object.keys(inner)) if (inner[k] && typeof inner[k] === 'object' && inner[k].contextInfo) return inner[k].contextInfo;
  return null;
}

// view-once ho to andar wala message return karta hai
export function findViewOnce(message) {
  if (!message) return null;
  const m = unwrap(message, { vo: false });
  const k = VO.find((x) => m[x]);
  if (k) return unwrap(m[k].message);
  const inner = unwrap(m);
  const t = Object.keys(inner).find((x) => /^(image|video|audio)Message$/.test(x));
  return t && inner[t]?.viewOnce ? inner : null;
}

export function getQuoted(m) {
  const ci = getCI(unwrap(m.message));
  if (!ci?.quotedMessage) return null;
  return {
    raw: ci.quotedMessage,
    message: unwrap(ci.quotedMessage),
    participant: ci.participant,
    stanzaId: ci.stanzaId,
    isStatus: ci.remoteJid === 'status@broadcast',
    viewOnce: findViewOnce(ci.quotedMessage),
  };
}

export function target(m, q, args = []) {
  const ci = getCI(unwrap(m.message));
  const ment = ci?.mentionedJid?.[0];
  if (ment) return jidNormalizedUser(ment);
  if (q?.participant) return jidNormalizedUser(q.participant);
  const n = args.find((a) => /^\+?\d{7,15}$/.test(a.replace(/[\s-]/g, '')));
  if (n) return toJid(n);
  return null;
}

/* ---------- media ---------- */
const MEDIA_RE = /^(image|video|audio|sticker|document)Message$/;

export function mediaInner(m, q, types = ['image', 'video', 'sticker']) {
  const ok = (inner) => {
    if (!inner) return null;
    const t = Object.keys(inner).find((k) => MEDIA_RE.test(k) && types.includes(k.replace('Message', '')));
    return t ? inner : null;
  };
  return ok(unwrap(m.message)) || ok(q?.viewOnce) || ok(q?.message) || null;
}

export async function downloadMedia(inner) {
  const t = Object.keys(inner || {}).find((k) => MEDIA_RE.test(k));
  if (!t) return null;
  const type = t.replace('Message', '');
  const stream = await downloadContentFromMessage(inner[t], type);
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return {
    type, buffer: Buffer.concat(chunks), mimetype: inner[t].mimetype,
    caption: inner[t].caption || '', ptt: !!inner[t].ptt, fileName: inner[t].fileName,
  };
}

export function toSendable(md, caption = md.caption) {
  switch (md.type) {
    case 'image': return { image: md.buffer, caption };
    case 'video': return { video: md.buffer, caption, mimetype: md.mimetype || 'video/mp4' };
    case 'audio': return { audio: md.buffer, mimetype: md.mimetype || 'audio/mpeg', ptt: md.ptt };
    case 'sticker': return { sticker: md.buffer };
    default: return { document: md.buffer, mimetype: md.mimetype || 'application/octet-stream', fileName: md.fileName || 'file', caption };
  }
}

// media bhejo; audio/sticker mein caption nahi hota is liye header alag text mein
export async function sendMedia(sock, to, md, header = '') {
  const cap = [header, md.caption].filter(Boolean).join('\n\n');
  if (md.type === 'audio' || md.type === 'sticker') {
    if (header) await sock.sendMessage(to, { text: header });
    return sock.sendMessage(to, toSendable(md));
  }
  return sock.sendMessage(to, toSendable(md, cap));
}

/* ---------- ffmpeg ---------- */
export async function ffmpeg(buf, inExt, outExt, extra = []) {
  let bin = 'ffmpeg';
  try { bin = (await import('ffmpeg-static')).default || 'ffmpeg'; } catch {}
  const id = Date.now() + Math.random().toString(36).slice(2);
  const inp = path.join(os.tmpdir(), `${id}.${inExt}`);
  const out = path.join(os.tmpdir(), `${id}.${outExt}`);
  fs.writeFileSync(inp, buf);
  try {
    await new Promise((res, rej) => execFile(bin, ['-y', '-i', inp, ...extra, out], { timeout: 120000 }, (e) => (e ? rej(e) : res())));
    return fs.readFileSync(out);
  } finally {
    try { fs.unlinkSync(inp); } catch {}
    try { fs.unlinkSync(out); } catch {}
  }
}

/* ---------- groups ---------- */
const metaCache = new Map();
export async function getMeta(sock, jid) {
  try {
    const c = metaCache.get(jid);
    if (c && Date.now() - c.t < 60000) return c.m;
    const m = await sock.groupMetadata(jid);
    metaCache.set(jid, { t: Date.now(), m });
    return m;
  } catch {
    return { participants: [] };
  }
}
export const clearMeta = (jid) => metaCache.delete(jid);
export const adminsOf = (meta) => (meta?.participants || []).filter((p) => p.admin).map((p) => jidNormalizedUser(p.id));