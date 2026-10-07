import { config } from "./config.js";
import { commands } from "./plugins/index.js";
import { getText, jidNumber, isGroupAdmin } from "./lib/command-utils.js";

export async function handleMessage(sock, msg) {
  if (!msg?.message || msg.key?.fromMe) return;
  const remote = msg.key?.remoteJid;
  if (!remote || remote === "status@broadcast") return;
  const text = getText(msg);
  if (!text.startsWith(config.prefix)) return;
  const body = text.slice(config.prefix.length).trim();
  if (!body) return;
  const parts = body.split(/\s+/);
  const name = parts.shift().toLowerCase();
  const args = parts;
  const command = commands.get(name);
  if (!command) return;
  const sender = jidNumber(msg.key.participant || remote);
  const isOwner = sender === jidNumber(config.ownerNumber);
  const isGroup = remote.endsWith("@g.us");
  let isAdmin = false;
  if (isGroup) {
    try { isAdmin = await isGroupAdmin(sock, remote, msg.key.participant || remote); } catch (err) { console.error("[COMMANDS] Admin check failed", err); }
  }
  const ctx = { sock, msg, remote, sender, isOwner, isGroup, isAdmin, args, text };
  if (command.owner && !isOwner) return sock.sendMessage(remote,{text:"❌ This command is for the bot owner only."},{quoted:msg});
  if (command.group && !isGroup) return sock.sendMessage(remote,{text:"❌ This command can only be used in groups."},{quoted:msg});
  try {
    await command.run(ctx);
  } catch (err) {
    console.error(`[COMMANDS] .${name} failed`, err);
    await sock.sendMessage(remote,{text:`❌ *Command failed*\n\n.${name}\n${err?.message || "Unexpected error."}`},{quoted:msg});
  }
}
