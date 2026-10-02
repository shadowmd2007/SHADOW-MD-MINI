import { config } from "./config.js";
import { commands } from "./plugins/index.js";

function jidNumber(jid = "") {
  return jid.split("@")[0].replace(/\D/g, "");
}

export async function handleMessage(sock, msg) {
  if (!msg.message || msg.key.fromMe) return;

  const remote = msg.key.remoteJid;
  const text =
    msg.message.conversation ||
    msg.message.extendedTextMessage?.text ||
    msg.message.imageMessage?.caption ||
    msg.message.videoMessage?.caption ||
    "";

  if (!text.startsWith(config.prefix)) return;

  const body = text.slice(config.prefix.length).trim();
  if (!body) return;

  const parts = body.split(/\s+/);
  const name = parts.shift().toLowerCase();
  const args = parts;
  const command = commands.get(name);
  if (!command) return;

  const sender = jidNumber(msg.key.participant || remote);
  const isOwner = sender === config.ownerNumber;
  const isGroup = remote.endsWith("@g.us");

  if (command.owner && !isOwner) {
    return sock.sendMessage(remote, { text: "❌ This command is for the bot owner only." }, { quoted: msg });
  }
  if (command.group && !isGroup) {
    return sock.sendMessage(remote, { text: "❌ This command can only be used in groups." }, { quoted: msg });
  }

  await command.run({ sock, msg, remote, sender, isOwner, isGroup, args, text });
}

