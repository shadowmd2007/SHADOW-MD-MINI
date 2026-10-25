// Shared helpers used by commands/*.js and commands.js.
export class CommandError extends Error {
  constructor(message) { super(message); this.name = 'CommandError'; }
}

export function parseArgs(text = '') { return String(text).trim().split(/\s+/).filter(Boolean); }
export function getQuoted(m) { return m?.message?.extendedTextMessage?.contextInfo?.quotedMessage || null; }
export function isGroup(jid = '') { return String(jid).endsWith('@g.us'); }

export async function reply(sock, remote, msg, text) {
  return sock.sendMessage(remote, { text: String(text) }, msg ? { quoted: msg } : {});
}

export function jidNumber(jid = '') { return String(jid).split('@')[0].split(':')[0].replace(/\D/g, ''); }

export function getTargetJids(msg, args = []) {
  const info = msg?.message?.extendedTextMessage?.contextInfo || {};
  const found = [...(info.mentionedJid || [])];
  if (info.participant && !found.includes(info.participant)) found.push(info.participant);
  if (!found.length) {
    for (const arg of args || []) {
      const n = String(arg).replace(/\D/g, '');
      if (n.length >= 8) found.push(`${n}@s.whatsapp.net`);
    }
  }
  return [...new Set(found)];
}

export async function requireGroupAdmin(ctx) {
  if (!ctx?.isGroup) throw new CommandError('❌ Ye command sirf group mein chalti hai.');
  const meta = await ctx.getMeta();
  const sender = String(ctx.senderJid || '').replace(/:\d+@/, '@');
  const participant = (meta?.participants || []).find(p => String(p.id || p.jid || '').replace(/:\d+@/, '@') === sender);
  if (!participant || !participant.admin) throw new CommandError('❌ Sirf group admins ye command chala sakte hain.');
}

export async function requireBotAdmin(ctx) {
  if (!ctx?.isGroup) throw new CommandError('❌ Ye command sirf group mein chalti hai.');
  const meta = await ctx.getMeta();
  const bot = String(ctx.sock?.user?.id || '').replace(/:\d+@/, '@');
  const participant = (meta?.participants || []).find(p => String(p.id || p.jid || '').replace(/:\d+@/, '@') === bot);
  if (!participant || !participant.admin) throw new CommandError('❌ Bot ko pehle group admin banao.');
}

export function formatDuration(seconds = 0) {
  let n = Math.max(0, Math.floor(Number(seconds) || 0));
  const d = Math.floor(n / 86400); n %= 86400;
  const h = Math.floor(n / 3600); n %= 3600;
  const m = Math.floor(n / 60); const s = n % 60;
  return [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : '', `${s}s`].filter(Boolean).join(' ');
}
export function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('en-PK', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'medium' }).format(date);
}

// Safe arithmetic parser: no eval/Function execution.
export function parseSimpleMath(expression = '') {
  const s = String(expression).replace(/\s+/g, '');
  if (!s || !/^[0-9.+\-*/()%]+$/.test(s)) throw new Error('Valid arithmetic expression likho.');
  if (/\/(?:0+(?:\.0*)?|\.0+)(?![0-9])/.test(s)) throw new Error('Zero se divide nahi kar sakte.');
  let i = 0;
  function expr() { let v = term(); while (s[i] === '+' || s[i] === '-') { const op=s[i++]; const r=term(); v=op==='+'?v+r:v-r; } return v; }
  function term() { let v = factor(); while (s[i] === '*' || s[i] === '/') { const op=s[i++]; const r=factor(); if(op==='/' && r===0) throw new Error('Zero se divide nahi kar sakte.'); v=op==='*'?v*r:v/r; } return v; }
  function factor() { if(s[i]==='+'){i++;return factor();} if(s[i]==='-'){i++;return -factor();} if(s[i]==='('){i++;const v=expr();if(s[i++]!==')')throw new Error('Brackets check karo.');return v;} const start=i; while(/[0-9.]/.test(s[i]||'') && i<s.length)i++; if(start===i)throw new Error('Expression check karo.'); const v=Number(s.slice(start,i)); if(!Number.isFinite(v))throw new Error('Number valid nahi.'); return v; }
  const result=expr(); if(i!==s.length || !Number.isFinite(result)) throw new Error('Expression valid nahi.'); return result;
}