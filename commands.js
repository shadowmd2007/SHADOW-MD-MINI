import crypto from "node:crypto";
import os from "node:os";
import { config } from "./config.js";
import { jidNumber, formatUptime, getContext, getTargets } from "./utils.js";

export const commands = new Map();
export const categories = new Map();

const EMOJI = {
  General: "🏠",
  Info: "ℹ️",
  Tools: "🛠️",
  Text: "📝",
  Fun: "🎲",
  Group: "👥",
  "Needs API": "🔌"
};

function add(def) {
  const cmd = { category: "General", desc: "", aliases: [], ...def };
  for (const n of [cmd.name, ...cmd.aliases]) commands.set(n.toLowerCase(), cmd);
  if (!categories.has(cmd.category)) categories.set(cmd.category, []);
  categories.get(cmd.category).push(cmd);
}

// Kept so index.js can call it; commands register themselves when this file loads.
export async function loadCommands() {
  return commands.size;
}

function menuText(prefix, showAll) {
  const ORDER = ["General", "Info", "Tools", "Text", "Fun", "Group", "Needs API"];
  const rank = (c) => (ORDER.includes(c) ? ORDER.indexOf(c) : 99);
  const sorted = [...categories].sort((a, b) => rank(a[0]) - rank(b[0]));
  const real = sorted.filter(([c]) => c !== "Needs API");
  const total = real.reduce((n, [, list]) => n + list.length, 0);
  const out = [
    `╭━━━〔 *${config.botName}* 〕━━━⬣`,
    `┃ 👑 Owner : ${config.ownerName}`,
    `┃ ⚙️ Prefix : ${prefix}`,
    `┃ 🧩 Commands : ${total}`,
    `┃ 🚀 Version : ${config.version}`,
    "╰━━━━━━━━━━━━━━━━━━⬣"
  ];
  for (const [cat, list] of showAll ? sorted : real) {
    out.push("", `╭──〔 ${EMOJI[cat] || "📌"} *${cat.toUpperCase()}* 〕`);
    for (const c of list) out.push(`│ ◦ ${prefix}${c.name}`);
    out.push("╰──────────────");
  }
  out.push("", `ℹ️ ${prefix}help <command> for details`);
  if (!showAll && categories.has("Needs API")) out.push(`🔌 ${prefix}menu all → names that need an API`);
  return out.join("\n");
}

const pickOne = (list) => list[crypto.randomInt(list.length)];

/* ───────────── GENERAL ───────────── */

add({
  name: "menu",
  category: "General",
  desc: "Show all commands",
  async run({ sock, remote, msg, args, prefix, reply }) {
    const showAll = (args[0] || "").toLowerCase() === "all";
    try {
      await sock.sendMessage(
        remote,
        { image: { url: config.imageUrl }, caption: `*${config.botName}* • Multi Device\nOwner: ${config.ownerName}` },
        { quoted: msg }
      );
    } catch {
      /* image is optional */
    }
    return reply(menuText(prefix, showAll));
  }
});

add({
  name: "help",
  category: "General",
  desc: "Help for a command",
  async run({ args, prefix, reply }) {
    let q = (args[0] || "").toLowerCase();
    if (q.startsWith(prefix)) q = q.slice(prefix.length);
    if (!q) {
      return reply(
        `*${config.botName} HELP*\n\n` +
          `• ${prefix}menu - all commands\n` +
          `• ${prefix}help <command> - details\n` +
          `• ${prefix}ping - check speed\n` +
          `• ${prefix}owner - contact the owner`
      );
    }
    const c = commands.get(q);
    if (!c) return reply(`❌ Unknown command: ${q}`);
    const extra = [c.owner && "owner only", c.group && "groups only", c.admin && "group admins", c.botAdmin && "bot must be admin"]
      .filter(Boolean)
      .join(", ");
    return reply(
      `*${prefix}${c.name}*\n${c.desc || "No description."}` +
        (c.aliases.length ? `\nAliases: ${c.aliases.map((a) => prefix + a).join(", ")}` : "") +
        (extra ? `\nNeeds: ${extra}` : "")
    );
  }
});

add({
  name: "ping",
  category: "General",
  desc: "Check bot speed",
  async run({ msg, reply }) {
    const ts = Number(String(msg.messageTimestamp || 0));
    const ms = ts ? Math.max(0, Date.now() - ts * 1000) : 0;
    return reply(`🏓 *Pong!* ${ms} ms`);
  }
});

add({
  name: "alive",
  category: "General",
  desc: "Check if the bot is online",
  async run({ reply }) {
    return reply(`✅ *${config.botName} is alive*\n⏱️ Uptime: ${formatUptime(process.uptime())}\n👑 Owner: ${config.ownerName}`);
  }
});

add({
  name: "owner",
  category: "General",
  desc: "Send the owner's contact",
  async run({ sock, remote, msg }) {
    const num = jidNumber(config.ownerNumber);
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${config.ownerName}`,
      `ORG:${config.botName};`,
      `TEL;type=CELL;type=VOICE;waid=${num}:+${num}`,
      "END:VCARD"
    ].join("\n");
    return sock.sendMessage(
      remote,
      { contacts: { displayName: config.ownerName, contacts: [{ vcard }] } },
      { quoted: msg }
    );
  }
});

add({
  name: "repo",
  aliases: ["github", "script"],
  category: "General",
  desc: "Bot source code",
  async run({ reply }) {
    return reply(`📦 *${config.botName}*\n${config.githubRepository}`);
  }
});

add({
  name: "channel",
  category: "General",
  desc: "Official channel",
  async run({ reply }) {
    const link = config.channelLink !== "#" ? `\n🔗 ${config.channelLink}` : "";
    return reply(`📢 *Channel*\n${config.channelName}\n🆔 ${config.channelJid}${link}`);
  }
});

add({
  name: "group",
  category: "General",
  desc: "Official group link",
  async run({ reply }) {
    if (config.groupLink === "#") return reply("ℹ️ Group link is not set. Add GROUP_LINK in Railway Variables.");
    return reply(`👥 *Group*\n${config.groupLink}`);
  }
});

/* ───────────── INFO ───────────── */

add({
  name: "jid",
  category: "Info",
  desc: "Show chat JID (and the JID of a replied/mentioned user)",
  async run({ remote, msg, args, reply }) {
    const targets = getTargets(msg, args);
    const lines = [`💬 *Chat JID*\n${remote}`];
    if (targets.length) lines.push(`\n👤 *User JID*\n${targets.join("\n")}`);
    return reply(lines.join("\n"));
  }
});

add({
  name: "url",
  category: "Info",
  desc: "Web pairing panel URL",
  async run({ reply }) {
    const domain = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.RAILWAY_STATIC_URL;
    if (!domain) return reply("ℹ️ No public domain yet. In Railway open Settings → Networking → Generate Domain.");
    return reply(`🌐 *Web panel*\nhttps://${domain.replace(/^https?:\/\//, "")}`);
  }
});

add({
  name: "status",
  aliases: ["runtime", "uptime"],
  category: "Info",
  desc: "Bot status",
  async run({ sock, reply }) {
    const mem = (process.memoryUsage().rss / 1024 / 1024).toFixed(0);
    return reply(
      `📊 *${config.botName} STATUS*\n\n` +
        `🟢 Connected: ${jidNumber(sock.user?.id) || "unknown"}\n` +
        `⏱️ Uptime: ${formatUptime(process.uptime())}\n` +
        `💾 Memory: ${mem} MB\n` +
        `🟩 Node: ${process.version}\n` +
        `🚀 Version: ${config.version}`
    );
  }
});

/* ───────────── TOOLS ───────────── */

add({
  name: "time",
  aliases: ["date"],
  category: "Tools",
  desc: "Current time. Example: time Asia/Karachi",
  async run({ args, reply }) {
    const tz = args[0] || "Asia/Karachi";
    try {
      const s = new Intl.DateTimeFormat("en-GB", { timeZone: tz, dateStyle: "full", timeStyle: "medium" }).format(new Date());
      return reply(`🕒 *${tz}*\n${s}`);
    } catch {
      return reply("❌ Unknown timezone. Example: Asia/Karachi");
    }
  }
});

add({
  name: "calc",
  aliases: ["math"],
  category: "Tools",
  desc: "Calculator. Example: calc 12*(3+4)",
  async run({ text, prefix, reply }) {
    const expr = text.replace(/\s+/g, "").replace(/\^/g, "**").replace(/×/g, "*").replace(/÷/g, "/");
    if (!expr) return reply(`Usage: ${prefix}calc 12*(3+4)`);
    if (!/^[0-9+\-*/().%]+$/.test(expr)) return reply("❌ Only numbers and + - * / % ^ ( ) are allowed.");
    let result;
    try {
      result = Function(`"use strict"; return (${expr});`)();
    } catch {
      return reply("❌ Invalid expression.");
    }
    if (typeof result !== "number" || !Number.isFinite(result)) return reply("❌ Result is not a finite number.");
    return reply(`🧮 ${text.trim()} = *${result}*`);
  }
});

add({
  name: "say",
  aliases: ["echo"],
  category: "Text",
  desc: "Repeat your text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}say hello`);
    return reply(text);
  }
});

add({
  name: "reverse",
  category: "Text",
  desc: "Reverse text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}reverse hello`);
    return reply([...text].reverse().join(""));
  }
});

add({
  name: "upper",
  category: "Text",
  desc: "UPPERCASE text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}upper hello`);
    return reply(text.toUpperCase());
  }
});

add({
  name: "lower",
  category: "Text",
  desc: "lowercase text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}lower HELLO`);
    return reply(text.toLowerCase());
  }
});

add({
  name: "count",
  category: "Text",
  desc: "Count characters and words",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}count some text`);
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return reply(`🔢 Characters: ${[...text].length}\n📝 Words: ${words}`);
  }
});

add({
  name: "b64",
  aliases: ["base64"],
  category: "Text",
  desc: "Encode text to Base64",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}b64 hello`);
    return reply(Buffer.from(text, "utf8").toString("base64"));
  }
});

add({
  name: "unb64",
  category: "Text",
  desc: "Decode Base64 text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}unb64 aGVsbG8=`);
    return reply(Buffer.from(text, "base64").toString("utf8") || "❌ Could not decode.");
  }
});

/* ───────────── FUN ───────────── */

add({
  name: "flip",
  aliases: ["coin"],
  category: "Fun",
  desc: "Flip a coin",
  async run({ reply }) {
    return reply(`🪙 ${crypto.randomInt(2) ? "Heads" : "Tails"}`);
  }
});

add({
  name: "dice",
  aliases: ["roll"],
  category: "Fun",
  desc: "Roll a dice. Example: dice 20",
  async run({ args, reply }) {
    const sides = Math.min(1000, Math.max(2, parseInt(args[0], 10) || 6));
    return reply(`🎲 d${sides}: *${crypto.randomInt(1, sides + 1)}*`);
  }
});

add({
  name: "pick",
  aliases: ["choose"],
  category: "Fun",
  desc: "Pick one option. Example: pick tea | coffee",
  async run({ text, prefix, reply }) {
    const options = text.split(/[|,]/).map((s) => s.trim()).filter(Boolean);
    if (options.length < 2) return reply(`Usage: ${prefix}pick tea | coffee`);
    return reply(`🎯 *${pickOne(options)}*`);
  }
});

add({
  name: "8ball",
  category: "Fun",
  desc: "Ask the magic 8-ball",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}8ball will it rain?`);
    return reply(
      `🎱 ${pickOne(["Yes.", "No.", "Maybe.", "Definitely!", "Ask again later.", "Very unlikely.", "Without a doubt.", "I wouldn't count on it."])}`
    );
  }
});

add({
  name: "joke",
  category: "Fun",
  desc: "Random joke",
  async run({ reply }) {
    return reply(
      pickOne([
        "Why do programmers prefer dark mode? Because light attracts bugs. 🐛",
        "I told my computer I needed a break. Now it won't stop sending me Kit-Kat ads.",
        "There are 10 kinds of people: those who understand binary and those who don't.",
        "Why did the phone go to school? To improve its smart-ness. 📱",
        "I would tell you a UDP joke, but you might not get it.",
        "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'"
      ])
    );
  }
});

add({
  name: "quote",
  category: "Fun",
  desc: "Random motivation",
  async run({ reply }) {
    return reply(
      `💭 ${pickOne([
        "Small steps every day beat big plans once a year.",
        "Done is better than perfect.",
        "Patience is bitter, but its fruit is sweet.",
        "Fall seven times, stand up eight.",
        "Discipline is choosing what you want most over what you want now.",
        "Start where you are. Use what you have."
      ])}`
    );
  }
});

/* ───────────── GROUP ───────────── */

add({
  name: "groupinfo",
  aliases: ["ginfo"],
  category: "Group",
  desc: "Group details",
  group: true,
  async run({ getMeta, reply }) {
    const meta = await getMeta();
    const admins = meta.participants.filter((p) => p.admin).length;
    return reply(
      `👥 *${meta.subject}*\n\n` +
        `👤 Members: ${meta.participants.length}\n` +
        `🛡️ Admins: ${admins}\n` +
        `🆔 ${meta.id}\n` +
        (meta.desc ? `\n📝 ${meta.desc}` : "")
    );
  }
});

add({
  name: "tagall",
  category: "Group",
  desc: "Mention everyone (admins)",
  group: true,
  admin: true,
  async run({ sock, remote, msg, text, getMeta }) {
    const meta = await getMeta();
    const ids = meta.participants.map((p) => p.id);
    const body = `📢 *TAG ALL*${text ? `\n${text}` : ""}\n\n` + ids.map((id) => `• @${jidNumber(id)}`).join("\n");
    return sock.sendMessage(remote, { text: body, mentions: ids }, { quoted: msg });
  }
});

add({
  name: "hidetag",
  category: "Group",
  desc: "Mention everyone silently (admins)",
  group: true,
  admin: true,
  async run({ sock, remote, msg, text, prefix, getMeta, reply }) {
    if (!text) return reply(`Usage: ${prefix}hidetag your message`);
    const meta = await getMeta();
    return sock.sendMessage(remote, { text, mentions: meta.participants.map((p) => p.id) }, { quoted: msg });
  }
});

add({
  name: "glink",
  aliases: ["gclink"],
  category: "Group",
  desc: "Group invite link (bot must be admin)",
  group: true,
  admin: true,
  botAdmin: true,
  async run({ sock, remote, reply }) {
    const code = await sock.groupInviteCode(remote);
    return reply(`🔗 https://chat.whatsapp.com/${code}`);
  }
});

function memberAction(name, action, desc, done) {
  add({
    name,
    category: "Group",
    desc,
    group: true,
    admin: true,
    botAdmin: true,
    async run({ sock, remote, msg, args, prefix, reply }) {
      let targets = getTargets(msg, args);
      if (action === "remove") {
        const protectedNums = new Set([jidNumber(config.ownerNumber), jidNumber(sock.user?.id)]);
        const before = targets.length;
        targets = targets.filter((t) => !protectedNums.has(jidNumber(t)));
        if (before && !targets.length) return reply("❌ I can't remove the owner or the bot itself.");
      }
      if (!targets.length) return reply(`Usage: ${prefix}${name} @user (or reply to their message)`);
      await sock.groupParticipantsUpdate(remote, targets, action);
      return reply(`${done} ${targets.map((t) => "@" + jidNumber(t)).join(", ")}`, { mentions: targets });
    }
  });
}
memberAction("promote", "promote", "Make a member admin", "⬆️ Promoted");
memberAction("demote", "demote", "Remove admin rights", "⬇️ Demoted");
memberAction("kick", "remove", "Remove a member", "👢 Removed");

add({
  name: "mute",
  category: "Group",
  desc: "Only admins can send messages",
  group: true,
  admin: true,
  botAdmin: true,
  async run({ sock, remote, reply }) {
    await sock.groupSettingUpdate(remote, "announcement");
    return reply("🔇 Group muted. Only admins can send messages.");
  }
});

add({
  name: "unmute",
  category: "Group",
  desc: "Everyone can send messages",
  group: true,
  admin: true,
  botAdmin: true,
  async run({ sock, remote, reply }) {
    await sock.groupSettingUpdate(remote, "not_announcement");
    return reply("🔊 Group unmuted.");
  }
});

add({
  name: "setname",
  category: "Group",
  desc: "Change group name",
  group: true,
  admin: true,
  botAdmin: true,
  async run({ sock, remote, text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}setname New Name`);
    await sock.groupUpdateSubject(remote, text.slice(0, 100));
    return reply("✅ Group name updated.");
  }
});

add({
  name: "setdesc",
  category: "Group",
  desc: "Change group description",
  group: true,
  admin: true,
  botAdmin: true,
  async run({ sock, remote, text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}setdesc New description`);
    await sock.groupUpdateDescription(remote, text);
    return reply("✅ Group description updated.");
  }
});

/* ───────────── 40 MORE COMMANDS (no external API needed) ───────────── */

const MORSE = {
  a: ".-", b: "-...", c: "-.-.", d: "-..", e: ".", f: "..-.", g: "--.", h: "....", i: "..", j: ".---",
  k: "-.-", l: ".-..", m: "--", n: "-.", o: "---", p: ".--.", q: "--.-", r: ".-.", s: "...", t: "-",
  u: "..-", v: "...-", w: ".--", x: "-..-", y: "-.--", z: "--..",
  0: "-----", 1: ".----", 2: "..---", 3: "...--", 4: "....-", 5: ".....", 6: "-....", 7: "--...", 8: "---..", 9: "----."
};
const MORSE_REV = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));

function caesarShift(str, shift) {
  return str.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode((((c.charCodeAt(0) - base + shift) % 26) + 26) % 26 + base);
  });
}

function textTool(name, desc, fn, aliases = []) {
  add({
    name,
    aliases,
    category: "Text",
    desc,
    async run({ text, prefix, reply }) {
      if (!text) return reply(`Usage: ${prefix}${name} <text>`);
      let out;
      try {
        out = fn(text);
      } catch (e) {
        return reply(`❌ ${e.message}`);
      }
      return reply(out);
    }
  });
}

textTool("hex", "Text to hex", (t) => Buffer.from(t, "utf8").toString("hex"));
textTool("unhex", "Hex to text", (t) => {
  const h = t.replace(/\s+/g, "");
  if (!/^[0-9a-fA-F]+$/.test(h) || h.length % 2) throw new Error("Invalid hex.");
  return Buffer.from(h, "hex").toString("utf8");
});
textTool("bin", "Text to binary", (t) =>
  [...Buffer.from(t, "utf8")].map((b) => b.toString(2).padStart(8, "0")).join(" ")
);
textTool("unbin", "Binary to text", (t) => {
  const parts = t.trim().split(/\s+/);
  if (!parts.every((p) => /^[01]{8}$/.test(p))) throw new Error("Use 8-bit groups, e.g. 01101000 01101001");
  return Buffer.from(parts.map((p) => parseInt(p, 2))).toString("utf8");
});
textTool("rot13", "ROT13 cipher", (t) => caesarShift(t, 13));
textTool("morse", "Text to Morse code", (t) =>
  t.toLowerCase().split("").map((c) => (c === " " ? "/" : MORSE[c])).filter(Boolean).join(" ")
);
textTool("unmorse", "Morse code to text (use / between words)", (t) =>
  t.trim().split(/\s+/).map((tok) => (tok === "/" ? " " : MORSE_REV[tok] ?? "?")).join("")
);
textTool("slug", "Make a URL slug", (t) => {
  const s = t.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!s) throw new Error("Nothing to convert.");
  return s;
});
textTool("title", "Title Case text", (t) =>
  t.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
);
textTool("mock", "sPoNgEbOb cAsE", (t) => {
  let i = 0;
  return [...t].map((ch) => (/\p{L}/u.test(ch) ? (i++ % 2 ? ch.toUpperCase() : ch.toLowerCase()) : ch)).join("");
});
textTool("fancy", "Bold fancy letters", (t) =>
  [...t]
    .map((ch) => {
      const c = ch.codePointAt(0);
      if (c >= 65 && c <= 90) return String.fromCodePoint(0x1d400 + c - 65);
      if (c >= 97 && c <= 122) return String.fromCodePoint(0x1d41a + c - 97);
      if (c >= 48 && c <= 57) return String.fromCodePoint(0x1d7ce + c - 48);
      return ch;
    })
    .join("")
);
textTool("palindrome", "Check if text is a palindrome", (t) => {
  const s = t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  if (!s) throw new Error("Nothing to check.");
  return s === [...s].reverse().join("") ? `✅ "${t}" is a palindrome` : `❌ "${t}" is not a palindrome`;
});

add({
  name: "caesar",
  category: "Text",
  desc: "Caesar cipher. Example: caesar 3 hello",
  async run({ args, prefix, reply }) {
    const shift = parseInt(args[0], 10);
    const text = args.slice(1).join(" ");
    if (!Number.isInteger(shift) || !text) return reply(`Usage: ${prefix}caesar 3 hello  (shift -25 to 25)`);
    return reply(caesarShift(text, shift % 26));
  }
});

add({
  name: "repeat",
  category: 