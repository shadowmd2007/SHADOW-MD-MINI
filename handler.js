import fs from 'fs';
import path from 'path';

export let settings;
let mod = null;

const deletedMessages = new Map();
const STORE_DIR = './deleted_messages';

async function load(force = false) {
if (!mod || force) {
mod = await import(
'./commands.js' + (force ? '?v=' + Date.now() : '')
);
settings = mod.settings;
}
return mod;
}

export async function loadCommands() {
try {
const m = await load(true);
console.log('COMMANDS LOADED:', m.totalCommands());
return m.totalCommands();
} catch (e) {
console.log('Load Error:', e.message);
return 0;
}
}

export async function onMessage(sock, upsert) {
const m = await load();

for (const msg of upsert.messages || []) {
if (!msg?.message) continue;

const jid = msg.key?.remoteJid;
if (!jid || jid === 'status@broadcast') continue;

// Cache ordinary messages for possible delete notifications.
const id = msg.key?.id;
if (id) {
  deletedMessages.set(`${jid}:${id}`, msg);

  if (deletedMessages.size > 1000) {
    const firstKey = deletedMessages.keys().next().value;
    deletedMessages.delete(firstKey);
  }
}

try {
  await m.handleMessage(sock, msg);
} catch (e) {
  console.log('onMessage error:', e.message);
}

}
}

export async function onDelete(sock, update) {
try {
const key = update?.key;
if (!key?.remoteJid || !key?.id) return;

const cached = deletedMessages.get(
  `${key.remoteJid}:${key.id}`
);
if (!cached) return;

const owner = process.env.OWNER_NUMBER;
if (!owner) {
  console.log('Set OWNER_NUMBER in Railway Variables.');
  return;
}

const ownerJid = owner.replace(/\D/g, '') + '@s.whatsapp.net';

await sock.sendMessage(ownerJid, {
  text: 'Deleted message detected. A cached copy is available, but automatic forwarding requires a supported delete event.'
});

} catch (e) {
console.log('onDelete error:', e.message);
}
}