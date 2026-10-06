import { config } from "../config.js";

export const jidNumber = (jid = "") => String(jid).split("@")[0].replace(/\D/g, "");

export function getText(msg) {
  return msg?.message?.conversation ||
    msg?.message?.extendedTextMessage?.text ||
    msg?.message?.imageMessage?.caption ||
    msg?.message?.videoMessage?.caption ||
    msg?.message?.documentMessage?.caption || "";
}

export function getQuoted(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    msg?.message?.imageMessage?.contextInfo?.quotedMessage ||
    msg?.message?.videoMessage?.contextInfo?.quotedMessage ||
    msg?.message?.documentMessage?.contextInfo?.quotedMessage || null;
}

export function getQuotedParticipant(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.participant ||
    msg?.message?.imageMessage?.contextInfo?.participant ||
    msg?.message?.videoMessage?.contextInfo?.participant ||
    msg?.message?.documentMessage?.contextInfo?.participant || null;
}

export function getMentions(msg) {
  return msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
}

export function getTargetJids(msg, args = []) {
  const ids = [...getMentions(msg)];
  const quoted = getQuotedParticipant(msg);
  if (quoted && !ids.includes(quoted)) ids.push(quoted);
  if (!ids.length && args[0] && /^\+?\d{8,15}$/.test(args[0])) ids.push(`${jidNumber(args[0])}@s.whatsapp.net`);
  return [...new Set(ids)];
}

export async function reply(sock, remote, msg, text) {
  return sock.sendMessage(remote, { text: String(text) }, { quoted: msg });
}

export function formatDuration(seconds) {
  let s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  return [d ? `${d}d` : "", h ? `${h}h` : "", m ? `${m}m` : "", `${s}s`].filter(Boolean).join(" ");
}

export function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-PK", { dateStyle: "full", timeStyle: "medium", timeZone: "Asia/Karachi" }).format(date);
}

export function parseSimpleMath(input) {
  const expr = String(input || "").replace(/,/g, "").trim();
  if (!expr || expr.length > 100 || !/^[0-9+\-*/%.()\s^]+$/.test(expr)) throw new Error("Only numbers and + - * / % ^ ( ) are allowed.");
  const js = expr.replace(/\^/g, "**");
  // Safe because the whitelist above excludes identifiers, strings and property access.
  const value = Function(`"use strict"; return (${js})`)();
  if (!Number.isFinite(value)) throw new Error("Result is not finite.");
  return value;
}

export async function isGroupAdmin(sock, remote, userJid) {
  if (!remote?.endsWith("@g.us")) return false;
  const meta = await sock.groupMetadata(remote);
  const normalized = jidNumber(userJid);
  return meta.participants.some(p => jidNumber(p.id) === normalized && (p.admin === "admin" || p.admin === "superadmin"));
}

export async function isBotAdmin(sock, remote) {
  if (!remote?.endsWith("@g.us")) return false;
  const meta = await sock.groupMetadata(remote);
  const bot = jidNumber(sock.user?.id || "");
  return meta.participants.some(p => jidNumber(p.id) === bot && (p.admin === "admin" || p.admin === "superadmin"));
}

export async function requireGroupAdmin(ctx) {
  if (!ctx.isGroup) throw new Error("This command can only be used in a group.");
  if (!(await isGroupAdmin(ctx.sock, ctx.remote, ctx.sender))) throw new Error("❌ Only group admins can use this command.");
}

export async function requireBotAdmin(ctx) {
  if (!(await isBotAdmin(ctx.sock, ctx.remote))) throw new Error("❌ I need to be a group admin for this command.");
}

export function ownerNumber(923003719761) { return config.ownerNumber; }
