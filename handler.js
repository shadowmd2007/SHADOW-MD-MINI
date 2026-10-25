// handler.js (FIXED) - commands.js sirf ek baar load hota hai, har message par dobara nahi
// (pehle har message par naya import hota tha: memory leak + settings reset ho jati thi)
export let settings;
let mod = null;

async function load(force = false) {
  if (!mod || force) {
    mod = await import('./commands.js' + (force ? '?v=' + Date.now() : ''));
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
    console.log('Load Error', e.message);
    return 0;
  }
}

export async function onMessage(sock, upsert) {
  const m = await load();
  for (const msg of upsert.messages || []) {
    if (!msg?.message) continue;
    if (msg.key?.remoteJid === 'status@broadcast') continue;
    try {
      await m.handleMessage(sock, msg);
    } catch (e) {
      console.log('onMessage error', e.message);
    }
  }
}

export async function onDelete() {
  return;
}