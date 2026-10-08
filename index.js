import { config } from "./config.js";
import { commands } from "./commands.js";
import { isOwnerCheck, getGroupMetadata } from "./utils.js";
export async function handleMessage(sock, msg) {
  try {
    if (!msg.message || msg.key.fromMe) return;
    const remote = msg.key.remoteJid;
    if (!remote) return;
    let body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || msg.message?.imageMessage?.caption || "";
    if (!body) return;
    if (!body.startsWith(config.prefix)) return;
    const args = body.slice(config.prefix.length).trim().split(/ +/);
    const cmdName = args.shift()?.toLowerCase();
    const cmd = commands.get(cmdName);
    if (!cmd) return;
    const reply = async (text) => { await sock.sendMessage(remote, { text }, { quoted: msg }); };
    const getMeta = async () => { if (!remote.endsWith("@g.us")) return null; return await getGroupMetadata(sock, remote); };
    await cmd.run({ sock, msg, remote, args, prefix: config.prefix, reply, isOwner: isOwnerCheck(msg,sock), isGroup: remote.endsWith("@g.us"), getMeta, body });
  } catch (e) { console.log(e.message); }
}