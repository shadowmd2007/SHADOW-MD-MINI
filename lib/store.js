const { makeInMemoryStore } = require("@whiskeysockets/baileys");
const pino = require("pino");

// In-memory store
const store = makeInMemoryStore({
    logger: pino().child({ level: "silent", stream: "store" })
});

// Store ko read/write karna
function bindStore(sock) {
    try {
        store.bind(sock.ev);
        console.log("✅ Store bind success");
    } catch (e) {
        console.log("❌ Store bind failed:", e.message);
    }
}

function getStore() {
    return store;
}

module.exports = {
    store,
    bindStore,
    getStore
};