// Safe Anti-Delete - No need to edit index.js
let store = new Map();
let enabledGroups = new Map();
let listenerAdded = false;

function setupListener(sock) {
  if (listenerAdded) return;
  listenerAdded = true;

  // 1. Saare messages save karo
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (let msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      let jid = msg.key.remoteJid;
      if (!store.has(jid)) store.set(jid, new Map());
      store.get(jid).set(msg.key.id, msg);
    }
  });

  // 2. Jab koi delete kare to wapas bhejo
  sock.ev.on('messages.update', async (updates) => {
    for (let { key, update } of updates) {
      if (update.messageStubType === 1 || update.messageStubType === 2) {
        let jid = key.remoteJid;
        if (!enabledGroups.get(jid)) continue;
        let saved = store.get(jid)?.get(key.id);
        if (!saved) continue;

        let name = saved.pushName || "Kisi ne";
        await sock.sendMessage(jid, { text: `*🚫 Anti-Delete Detected*\n*${name}* ne message delete kiya!` });
        await sock.sendMessage(jid, { forward: saved }, { quoted: saved });
      }
    }
  });
}

module.exports = {
  name: "antidelete",
  alias: ["ad", "antidel"],
  desc: "Anti delete on/off",

  async run(sock, m, args) {
    setupListener(sock);
    let jid = m.key.remoteJid;
    let opt = args[0]?.toLowerCase();

    if (opt === "on") {
      enabledGroups.set(jid, true);
      await sock.sendMessage(jid, { text: "✅ *Anti-Delete ON*\nAb koi msg delete karega to me dikha dunga!" }, { quoted: m });
    } else if (opt === "off") {
      enabledGroups.set(jid, false);
      await sock.sendMessage(jid, { text: "❌ *Anti-Delete OFF*" }, { quoted: m });
    } else {
      await sock.sendMessage(jid, { text: "Use: *.antidelete on* / *.antidelete off*" }, { quoted: m });
    }
  }
};