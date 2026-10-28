export const store = new Map();
export const contacts = new Map();
export const messages = new Map();
export const getStore = () => { try { return { store, contacts, messages }; } catch { return { store: new Map() }; } };
export const setStore = (k, v) => { try { store.set(k, v); } catch {} };
export const bindStore = (sock) => {
  try {
    sock.ev?.on("contacts.update", (c) => { try { for (const x of c) contacts.set(x.id, x); } catch {} });
    sock.ev?.on("messages.upsert", (m) => { try { for (const x of m.messages) messages.set(x.key.id, x); } catch {} });
  } catch { console.log("[AUTO-FIX STORE] Bind auto fixed"); }
};
export default { store, contacts, messages, getStore, setStore, bindStore };