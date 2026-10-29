import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMMANDS_DIR = path.join(__dirname, '../commands');

// ===== Error that is shown to the user as a normal reply =====
export class CommandError extends Error {
  constructor(message) { super(message); this.name = 'CommandError'; }
}

const dg = (j) => String(j || '').split('@')[0].split(':')[0].replace(/\D/g, '');
export const jidNumber = (j) => dg(j);

// ===== reply: supports reply(sock, msg, text) AND reply(sock, jid, msg, text) =====
export async function reply(...a) {
  try {
    const sock = a[0];
    let jid, msg, text;
    if (a.length >= 4) { [, jid, msg, text] = a; }
    else { [, msg, text] = a; jid = msg?.key?.remoteJid || msg; }
    if (!sock || !jid) return null;
    const content = (text && typeof text === 'object') ? text : { text: String(text ?? '') };
    return await sock.sendMessage(jid, content, msg?.key ? { quoted: msg } : undefined);
  } catch (e) { console.log('reply err:', e.message); return null; }
}

// ===== REAL permission checks (ctx is built by index.js) =====
async function adminState(ctx, ids) {
  const meta = await ctx.getMeta();
  const want = new Set(ids.map(dg).filter(Boolean));
  const p = (meta?.participants || []).find((x) =>
    [x.id, x.jid, x.lid, x.phoneNumber].filter(Boolean).map(dg).some((n) => want.has(n)));
  if (!p) return 'unknown';
  return (p.admin === 'admin' || p.admin === 'superadmin') ? 'admin' : 'member';
}

export async function requireGroupAdmin(ctx) {
  if (!ctx || typeof ctx.getMeta !== 'function') return true;
  if (ctx.isOwner) return true;
  if (!ctx.isGroup) throw new CommandError('❌ This command can only be used in groups.');
  const s = await adminState(ctx, [ctx.senderJid]);
  if (s !== 'admin') throw new CommandError('❌ Only group admins can use this command.');
  return true;
}

export async function requireBotAdmin(ctx) {
  if (!ctx || typeof ctx.getMeta !== 'function') return true;
  if (!ctx.isGroup) throw new CommandError('❌ This command can only be used in groups.');
  const s = await adminState(ctx, [ctx.botJid, ctx.botLid]);
  if (s === 'member') throw new CommandError('❌ I need to be a group admin to do that. Please make me an admin first.');
  return true;
}

export async function isAdmin(ctx) { try { return (await adminState(ctx, [ctx.senderJid])) === 'admin'; } catch { return false; } }
export async function isBotAdmin(ctx) { try { return (await adminState(ctx, [ctx.botJid, ctx.botLid])) !== 'member'; } catch { return false; } }
export async function isOwner(ctx) { return !!ctx?.isOwner; }
export function isGroup(jid) { return typeof jid === 'string' && jid.endsWith('@g.us'); }

// ===== helpers used by commands =====
export function getTargetJids(msg, args = []) {
  const m = msg?.message || {};
  const inner = m.ephemeralMessage?.message || m.viewOnceMessage?.message || m;
  const info = inner.extendedTextMessage?.contextInfo || {};
  if (info.mentionedJid?.length) return [...new Set(info.mentionedJid)];
  if (info.participant) return [info.participant];
  return (args || [])
    .map((a) => String(a).replace(/\D/g, ''))
    .filter((n) => n.length >= 8 && n.length <= 15)
    .map((n) => n + '@s.whatsapp.net');
}

export function formatDuration(sec) {
  sec = Math.max(0, Math.floor(Number(sec) || 0));
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600),
    m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

export function formatDate(date = new Date()) {
  return new Date(date).toLocaleString('en-GB', {
    timeZone: 'Asia/Karachi', weekday: 'long', year: 'numeric', month: 'long',
    day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
}

export function parseSimpleMath(expr) {
  const e = String(expr || '').trim();
  if (!e) throw new Error('Usage: .calc 5*(3+2)');
  if (!/^[0-9+\-*/%^().\s]+$/.test(e)) throw new Error('Only numbers and + - * / % ^ ( ) are allowed.');
  let v;
  try { v = Function(`"use strict"; return (${e.replace(/\^/g, '**')});`)(); }
  catch { throw new Error('Invalid expression.'); }
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error('Invalid result.');
  return Math.round(v * 1e10) / 1e10;
}

export async function sendImage(sock, jid, url, caption) {
  try { return await sock.sendMessage(jid, { image: { url }, caption }); } catch { return null; }
}
export async function sendVideo(sock, jid, url, caption) {
  try { return await sock.sendMessage(jid, { video: { url }, caption }); } catch { return null; }
}

// ===== command listing =====
export function getAllCommands() {
  try {
    if (!fs.existsSync(COMMANDS_DIR)) return [];
    return fs.readdirSync(COMMANDS_DIR).filter((f) => f.endsWith('.js')).map((f) => path.basename(f, '.js'));
  } catch { return []; }
}
export const getCommandsCount = () => getAllCommands().length;
export const getCommandsList = () => getAllCommands().map((n) => `.${n}`).join('\n');

export default {
  CommandError, reply, requireBotAdmin, requireGroupAdmin, isGroup, isAdmin, isBotAdmin, isOwner,
  getTargetJids, jidNumber, formatDuration, formatDate, parseSimpleMath,
  sendImage, sendVideo, getAllCommands, getCommandsCount, getCommandsList
};
