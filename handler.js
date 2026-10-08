import { config } from "./config.js";
import { commands } from "./commands.js";
import { getText, jidNumber, isAdminIn } from "./utils.js";

const startedAt = Math.floor(Date.now() / 1000);

export async function handleMessage(sock, msg)
{
  if (!msg?.message) return;
  const remote = msg.key?.remoteJid;
  if (!remote || remote === "status@broadcast" || remote.endsWith("@newsletter")) return;

  // Ignore old messages replayed after a reconnect.
  const ts = Number(String(msg.messageTimestamp || 0));
  if (ts && ts < startedAt - 60) return;

  const fullText = getText(msg).trim();
  if (!fullText.startsWith(config.prefix)) return;
  const body = fullText.slice(config.prefix.length).trim();
  if (!body) return;

  const [rawName, ...args] = body.split(/\s+/);
  const name = rawName.toLowerCase();
  const command = commands.get(name);
  if (!command) return;

  const isGroup = remote.endsWith("@g.us");
  const fromMe = Boolean(msg.key.fromMe);
  const senderJid = fromMe ? sock.user?.id : msg.key.participant || remote;
  const sender = jidNumber(senderJid);
  // The paired account itself is always the owner.
  const isOwner = fromMe || sender === jidNumber(config.ownerNumber);

  let meta = null;
  const getMeta = async () => {
    if (!isGroup) throw new Error("This is not a group.");
    meta ||= await sock.groupMetadata(remote);
    return meta;
  };

  const reply = (text, extra = {}) => sock.sendMessage(remote, { text, ...extra }, { quoted: msg });

  const ctx = {
    sock,
    msg,
    remote,
    sender,
    senderJid,
    isOwner,
    isGroup,
    args,
    text: args.join(" "),
    fullText,
    command: name,
    prefix: config.prefix,
    config,
    reply,
    getMeta
  };

  try {
    if (command.owner && !isOwner) return reply("❌ This command is for the bot owner only.");
    if (command.group && !isGroup) return reply("❌ This command can only be used in groups.");

    if (command.admin && !isOwner) {
      const m = await getMeta();
      if (!isAdminIn(m, senderJid)) return reply("❌ Only group admins can use this command.");
    }
    if (command.botAdmin) {
      const m = await getMeta();
      if (!isAdminIn(m, sock.user?.id)) return reply("❌ Make the bot a group admin first.");
    }

    await command.run(ctx);
  } catch (err) {
    console.error(`[COMMANDS] ${config.prefix}${name} failed`, err);
    try {
      await reply(`❌ *Command failed*\n\n${config.prefix}${name}\n${err?.message || "Unexpected error."}`);
    } catch {
      /* ignore */
    }
  }
}