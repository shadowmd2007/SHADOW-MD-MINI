// === ANTI-DELETE SYSTEM ===
global.antidelete = global.antidelete || new Map();
global.messageStore = global.messageStore || new Map();

function setupAntiDelete(sock) {
  // message save karo
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.message) continue;
      if (msg.key.fromMe) continue;
      const jid = msg.key.remoteJid;
      if (!global.messageStore.has(jid)) global.messageStore.set(jid, new Map());
      global.messageStore.get(jid).set(msg.key.id, msg);
    }
  });

  // jab koi delete kare
  sock.ev.on('messages.update', async (updates) => {
    for (const { key, update } of updates) {
      if (update.messageStubType === 1 || update.messageStubType === 2) { // REVOKE
        const jid = key.remoteJid;
        const isOn = global.antidelete.get(jid);
        if (!isOn) continue;

        const storedMsg = global.messageStore.get(jid)?.get(key.id);
        if (!storedMsg) continue;

        const sock2 = global.sock || sock;
        await sock2.sendMessage(jid, { forward: storedMsg }, { quoted: storedMsg });
        await sock2.sendMessage(jid, { text: `*🚫 Anti-Delete*\n*${storedMsg.pushName}* ne message delete kiya tha!` });
      }
    }
  });
}
global.setupAntiDelete = setupAntiDelete;