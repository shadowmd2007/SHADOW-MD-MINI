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
    const router = await load(true);
    console.log('COMMANDS LOADED:', router.totalCommands());
    return router.totalCommands();
  } catch (error) {
    console.error('Load Error:', error.message);
    return 0;
  }
}

export async function onMessage(sock, upsert) {
  const router = await load();
  for (const message of upsert?.messages || []) {
    if (!message?.message) continue;
    const jid = message.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') continue;
    try {
      await router.handleMessage(sock, message);
    } catch (error) {
      console.error('onMessage error:', error.message);
    }
  }
}