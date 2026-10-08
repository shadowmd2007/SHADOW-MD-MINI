import { config } from "./config.js";
import { commands } from "./commands.js";
import { isOwnerCheck, getGroupMetadata } from "./utils.js";
const spamMap = new Map();
export async function handleMessage(sock, msg) {
  try {
    if (!msg.message) return;
    if (msg.key.fromMe) return;
    const remote = msg.key.remoteJid;
    if (!remote) return;
    const isGroup = remote.endsWith("@g.us");
    if (isGroup && global.botSettings?.antilink) {
      let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || msg.message?.videoMessage?.caption || "";
      if (body.match(/(https?:\/\/|www\.|wa\.me\/|chat\.whatsapp\.com)/i)) {
        let meta = await getGroupMetadata(sock, remote).catch(()=>null);
        let isAdmin = meta?.participants?.find(p=>p.id===msg.key.participant)?.admin;
        if (!isAdmin) { await sock.sendMessage(remote, { delete: msg.key }); await sock.sendMessage(remote, { text: `🚫 *Antilink ON!*` }); return; }
      }
    }
    if (isGroup && global.botSettings?.onlyadmin) {
      let meta = await getGroupMetadata(sock, remote).catch(()=>null);
      let sender = msg.key.participant;
      let isAdmin = meta?.participants?.find(p=>p.id===sender)?.admin;
      if (!isAdmin &&!isOwnerCheck(msg,sock)) return;
    }
    if (global.botSettings?.autoreact) { try { const emojis=["❤️","😂","🔥","😍","🤩","👍","🥰"]; await sock.sendMessage(remote, { react: { text: emojis[Math.floor(Math.random()*emojis.length)], key: msg.key } }); } catch {} }
    if (global.botSettings?.autotyping) { try { await sock.sendPresenceUpdate("composing", remote); } catch {} }
    if (global.botSettings?.autorecording) { try { await sock.sendPresenceUpdate("recording", remote); } catch {} }
    let body = ""; if (msg.message.conversation) body = msg.message.conversation; else if (msg.message.extendedTextMessage?.text) body = msg.message.extendedTextMessage.text; else if (msg.message.imageMessage?.caption) body = msg.message.imageMessage.caption; else if (msg.message.videoMessage?.caption) body = msg.message.videoMessage.caption; if (!body) return;
    if (!body.startsWith(config.prefix)) return;
    const args = body.slice(config.prefix.length).trim().split(/ +/);
    const cmdName = args.shift()?.toLowerCase();
    const cmd = commands.get(cmdName); if (!cmd) return;
    const reply = async (text) => { await sock.sendMessage(remote, { text }, { quoted: msg }); };
    const getMeta = async () => { if (!isGroup) return null; return await getGroupMetadata(sock, remote); };
    await cmd.run({ sock, msg, remote, args, prefix: config.prefix, reply, isOwner: isOwnerCheck(msg,sock), isGroup, getMeta, body });
  } catch (e) { console.log("Handler error:", e.message); }
}