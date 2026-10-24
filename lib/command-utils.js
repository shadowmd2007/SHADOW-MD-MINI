
// lib/command-utils.js - FIXED
export function parseArgs(text) {
  return text.trim().split(/ +/).filter(Boolean);
}

export function getQuoted(m) {
  return m.message?.extendedTextMessage?.contextInfo?.quotedMessage || null;
}

export function isGroup(jid) {
  return jid.endsWith('@g.us');
}