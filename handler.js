import { config } from "./config.js";
import { commands } from "./plugins/index.js";
import { getText, jidNumber, isGroupAdmin } from "./lib/command-utils.js";

export async function handleMessage(sock, msg) {
  if (!msg?.message) return;
  const remote = msg.key?.remoteJid;
  if (!remote || remote === "status@broadcast") return;

  const text = getText(msg);
  if (!text) return;
  
  console.log(`[NEW MSG] ${remote}: ${text}`);

  // Prefix check
  if (!text.startsWith(config.prefix)) return;
  
  const body = text.slice(config.prefix.length).trim();
  if (!body) return;
  
  const parts = body.split(/\s+/);
  const name = parts.shift().toLowerCase();
  const args = parts;

  // Agar plugin load nahi hua to bhi ping chale
  if (name === "ping") {
    return await sock.sendMessage(remote, { text: `*Pong!* 🏓\n*${config.botName} v${config.version} is Alive!*` }, { quoted: msg });
  }
  if (name === "alive") {
    return await sock.sendMessage(remote, { text: `🟢 *${config.botName} ONLINE*\nOwner: ${config.ownerName}` }, { quoted: msg });
  }

  const command = commands.get(name);
  if (!command) {
    console.log(`[COMMAND NOT FOUND] .${name} | Loaded commands: ${[...commands.keys()].join(", ")}`);
    // Agar command nahi mila to user ko batana band hai, sirf log me ayega
    return;
  }

  const sender = jidNumber(msg.key.participant || remote);
  const isOwner = sender === jidNumber(config.ownerNumber);
  const isGroup = remote.endsWith("@g.us");
  let isAdmin = false;
  if (isGroup) {
    try { isAdmin = await isGroupAdmin(sock, remote, msg.key.participant || remote); } catch (err) {}
  }

  const ctx = { sock, msg, remote, sender, isOwner, isGroup, isAdmin, args, text };

  // --- PUBLIC MODE FIX ---
  // Agar mode public hai to sab ko allow karo
  if (config.mode === "private" && !isOwner && !isGroup) {
     return; // private mode me sirf owner ko reply
  }

  if (command.owner && !isOwner) return sock.sendMessage(remote,{text:"❌ Owner only."},{quoted:msg});
  if (command.group && !isGroup) return sock.sendMessage(remote,{text:"❌ Group only."},{quoted:msg});

  try {
    await command.run(ctx);
  } catch (err) {
    console.error(`[COMMANDS] .${name} failed`, err);
    await sock.sendMessage(remote,{text:`❌ Error: ${err?.message}`},{quoted:msg});
  }
}