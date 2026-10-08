export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// WhatsApp wraps messages (ephemeral, view-once, edits...). Peel them off.
export function unwrap(message) {
  let m = message || {};
  for (let i = 0; i < 6; i++) {
    const next =
      m.ephemeralMessage?.message ||
      m.viewOnceMessage?.message ||
      m.viewOnceMessageV2?.message ||
      m.viewOnceMessageV2Extension?.message ||
      m.documentWithCaptionMessage?.message ||
      m.editedMessage?.message;
    if (!next) break;
    m = next;
  }
  return m;
}

export function getText(msg) {
  const m = unwrap(msg?.message);
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    m.templateButtonReplyMessage?.selectedId ||
    ""
  );
}

export function getContext(msg) {
  const m = unwrap(msg?.message);
  const inner =
    m.extendedTextMessage ||
    m.imageMessage ||
    m.videoMessage ||
    m.documentMessage ||
    m.audioMessage ||
    m.stickerMessage;
  return inner?.contextInfo || {};
}

export function jidNumber(jid = "") {
  return String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

export function toJid(number) {
  return `${jidNumber(number)}@s.whatsapp.net`;
}

// Users targeted by a command: @mentions, else the replied-to person, else numbers in args.
export function getTargets(msg, args = []) {
  const ctx = getContext(msg);
  const found = new Set(ctx.mentionedJid || []);
  if (!found.size && ctx.participant) found.add(ctx.participant);
  if (!found.size) {
    for (const a of args) {
      const n = String(a).replace(/\D/g, "");
      if (n.length >= 8 && n.length <= 15) found.add(`${n}@s.whatsapp.net`);
    }
  }
  return [...found];
}

export function formatUptime(totalSeconds) {
  const s = Math.floor(totalSeconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (d || h) parts.push(`${h}h`);
  parts.push(`${m}m`, `${s % 60}s`);
  return parts.join(" ");
}

function participantMatches(p, jid) {
  const num = jidNumber(jid);
  if (!num) return false;
  return (
    p.id === jid ||
    jidNumber(p.id) === num ||
    (p.phoneNumber && jidNumber(p.phoneNumber) === num) ||
    (p.lid && jidNumber(p.lid) === num)
  );
}

export function isAdminIn(meta, jid) {
  const p = meta?.participants?.find((x) => participantMatches(x, jid));
  return p?.admin === "admin" || p?.admin === "superadmin";
}

export async function isGroupAdmin(sock, groupJid, userJid) {
  const meta = await sock.groupMetadata(groupJid);
  return isAdminIn(meta, userJid);
}
