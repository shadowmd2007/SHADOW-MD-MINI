import crypto from "node:crypto";
import { config } from "./config.js";
import { jidNumber, formatUptime, getContext, getTargets } from "./utils.js";

export const commands = new Map();
export const categories = new Map();

const EMOJI = {
  General: "🏠",
  Info: "ℹ️",
  Tools: "🛠️",
  Fun: "🎲",
  Group: "👥",
  "Settings Menu": "⚙️",
  "Needs API": "🔌"
};
// ========= FULL SETTING COMMANDS - 18 COMMANDS =========

// CONFIG STORE
const settingDB = {
  ownerName: "Owner",
  ownerNumber: "",
  prefix: ".",
  welcome: new Map(),
  goodbye: new Map(),
  antidelete: new Map(),
  antistatus: new Map(),
  statusview: new Map(),
  statusreact: new Map(),
  statuslike: new Map(),
  autoreact: new Map(),
  alwaysonline: new Map(),
  autotyping: new Map(),
  autorecording: new Map(),
  anticall: new Map(),
  autoread: new Map(),
};

let listeners = {
  delete: false, status: false, view: false, react: false, like: false,
  areact: false, online: false, typing: false, recording: false, read: false, call: false
};

// 1. ANTI-DELETE
const delStore = new Map();
add({
  name: "antidelete", aliases: ["ad"], category: "Setting", desc: "Anti delete",
  async run({ sock, remote, args, reply, prefix }) {
    if (!listeners.delete) {
      listeners.delete = true;
      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (let m of messages) {
          if (m.key.fromMe ||!m.message) continue;
          if (!delStore.has(m.key.remoteJid)) delStore.set(m.key.remoteJid, new Map());
          delStore.get(m.key.remoteJid).set(m.key.id, m);
        }
      });
      sock.ev.on('messages.update', async (upds) => {
        for (let { key, update } of upds) {
          if ((update.messageStubType === 1 || update.messageStubType === 2) && settingDB.antidelete.get(key.remoteJid)) {
            let s = delStore.get(key.remoteJid)?.get(key.id);
            if (s) { await sock.sendMessage(key.remoteJid, { text: "*🚫 Deleted Message Recovered*" }); await sock.sendMessage(key.remoteJid, { forward: s }); }
          }
        }
      });
    }
    let o = (args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.antidelete.set(remote,true); return reply("✅ AntiDelete ON"); }
    if(o==="off"){ settingDB.antidelete.set(remote,false); return reply("❌ AntiDelete OFF"); }
    return reply(`*AntiDelete:* ${settingDB.antidelete.get(remote)?"ON ✅":"OFF ❌"}\n${prefix}antidelete on/off`);
  }
});

// 2. ANTI-STATUS
const sStore = new Map();
add({
  name: "antistatus", category: "Setting", desc: "Anti status",
  async run({ sock, remote, args, reply, prefix }) {
    if (!listeners.status) {
      listeners.status = true;
      sock.ev.on('messages.upsert', async ({ messages }) => {
        for (let m of messages) if(m.key.remoteJid==="status@broadcast"&&!m.key.fromMe) sStore.set(m.key.id, m);
      });
      sock.ev.on('messages.update', async (upds) => {
        for (let { key, update } of upds) {
          if(key.remoteJid==="status@broadcast"&&(update.messageStubType===1||update.messageStubType===2)){
            for(let [jid,en] of settingDB.antistatus) if(en){ let s=sStore.get(key.id); if(s){ await sock.sendMessage(jid,{text:"*🚫 Anti-Status*"}); await sock.sendMessage(jid,{forward:s}); } }
          }
        }
      });
    }
    let o=(args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.antistatus.set(remote,true); return reply("✅ AntiStatus ON"); }
    if(o==="off"){ settingDB.antistatus.set(remote,false); return reply("❌ AntiStatus OFF"); }
    return reply(`${prefix}antistatus on/off`);
  }
});

// 3. STATUS VIEW
add({
  name: "statusview", aliases: ["sv"], category: "Setting", desc: "Auto status view",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.view){ listeners.view=true; sock.ev.on('messages.upsert', async({messages})=>{ for(let m of messages) if(m.key.remoteJid==="status@broadcast") for(let[jid,en]of settingDB.statusview) if(en) try{ await sock.readMessages([m.key]); }catch{} }); }
    let o=(args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.statusview.set(remote,true); return reply("✅ StatusView ON"); }
    if(o==="off"){ settingDB.statusview.set(remote,false); return reply("❌ StatusView OFF"); }
    return reply(`${prefix}statusview on/off`);
  }
});

// 4. STATUS REACT
add({
  name: "statusreact", aliases: ["sr"], category: "Setting", desc: "Auto status react",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.react){ listeners.react=true; sock.ev.on('messages.upsert', async({messages})=>{ for(let m of messages){ if(m.key.remoteJid!=="status@broadcast"||m.key.fromMe) continue; for(let[jid,d]of settingDB.statusreact) if(d?.enabled) try{ let e=d.emoji||["❤️","🔥","😍","👍"][Math.floor(Math.random()*4)]; await sock.sendMessage("status@broadcast",{react:{text:e,key:m.key}},{statusJidList:[m.key.participant]}); }catch{} } }); }
    let o=(args[0]||"").toLowerCase(); let em=args[1];
    if(o==="on"){ settingDB.statusreact.set(remote,{enabled:true,emoji:em||null}); return reply(`✅ StatusReact ON ${em||"Random"}`); }
    if(o==="off"){ settingDB.statusreact.set(remote,{enabled:false}); return reply("❌ StatusReact OFF"); }
    return reply(`${prefix}statusreact on [emoji] / off`);
  }
});

// 5. STATUS LIKE
add({
  name: "statuslike", aliases: ["sl"], category: "Setting", desc: "Status like",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.like){ listeners.like=true; sock.ev.on('messages.upsert', async({messages})=>{ for(let m of messages){ if(m.key.remoteJid!=="status@broadcast"||m.key.fromMe) continue; for(let[jid,d]of settingDB.statuslike) if(d?.enabled) try{ await sock.sendMessage("status@broadcast",{react:{text:d.emoji||"❤️",key:m.key}},{statusJidList:[m.key.participant]}); await sock.readMessages([m.key]); }catch{} } }); }
    let o=(args[0]||"").toLowerCase(); let em=args[1]||"❤️";
    if(o==="on"){ settingDB.statuslike.set(remote,{enabled:true,emoji:em}); return reply(`✅ StatusLike ON ${em}`); }
    if(o==="off"){ settingDB.statuslike.set(remote,{enabled:false}); return reply("❌ OFF"); }
    return reply(`${prefix}statuslike on / off`);
  }
});

// 6. BOT DP
add({
  name: "botdp", category: "Setting", desc: "Set bot dp",
  async run({ sock, msg, reply, prefix }) {
    try{
      let q=msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      let img=msg.message?.imageMessage||q?.imageMessage;
      if(!img) return reply(`Image ke sath ${prefix}botdp bhejo`);
      let buf=await sock.downloadMediaMessage(q?{message:{imageMessage:img}}:msg);
      await sock.updateProfilePicture(sock.user.id, buf);
      return reply("✅ Bot DP Changed");
    }catch{ return reply("❌ Fail"); }
  }
});

// 7. AUTO REACT
add({
  name: "autoreact", aliases: ["ar"], category: "Setting", desc: "Auto react chat",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.areact){ listeners.areact=true; sock.ev.on('messages.upsert', async({messages})=>{ for(let m of messages){ if(m.key.fromMe||!m.message) continue; let d=settingDB.autoreact.get(m.key.remoteJid); if(!d?.enabled) continue; try{ let e=d.emoji||["❤️","🔥","😂","👍"][Math.floor(Math.random()*4)]; await sock.sendMessage(m.key.remoteJid,{react:{text:e,key:m.key}}); }catch{} } }); }
    let o=(args[0]||"").toLowerCase(); let em=args[1];
    if(o==="on"){ settingDB.autoreact.set(remote,{enabled:true,emoji:em||null}); return reply(`✅ AutoReact ON ${em||"Random"}`); }
    if(o==="off"){ settingDB.autoreact.set(remote,{enabled:false}); return reply("❌ AutoReact OFF"); }
    return reply(`${prefix}autoreact on [emoji] / off`);
  }
});

// 8. ALWAYS ONLINE
let onlineInt=null;
add({
  name: "alwaysonline", aliases: ["aonline"], category: "Setting", desc: "Always online",
  async run({ sock, remote, args, reply, prefix }) {
    if(!onlineInt) onlineInt=setInterval(async()=>{ for(let[jid,en]of settingDB.alwaysonline) if(en) try{ await sock.sendPresenceUpdate("available",jid); }catch{} },15000);
    let o=(args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.alwaysonline.set(remote,true); await sock.sendPresenceUpdate("available",remote); return reply("✅ AlwaysOnline ON"); }
    if(o==="off"){ settingDB.alwaysonline.set(remote,false); return reply("❌ AlwaysOnline OFF"); }
    return reply(`${prefix}alwaysonline on/off`);
  }
});

// 9. AUTO TYPING
add({
  name: "autotyping", aliases: ["at"], category: "Setting", desc: "Auto typing",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.typing){ listeners.typing=true; sock.ev.on('messages.upsert', async({messages})=>{ for(let m of messages){ if(m.key.fromMe) continue; if(settingDB.autotyping.get(m.key.remoteJid)) try{ await sock.sendPresenceUpdate("composing", m.key.remoteJid); }catch{} } }); }
    let o=(args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.autotyping.set(remote,true); return reply("✅ AutoTyping ON"); }
    if(o==="off"){ settingDB.autotyping.set(remote,false); return reply("❌ AutoTyping OFF"); }
    return reply(`${prefix}autotyping on/off`);
  }
});

// 10. AUTO RECORDING
add({
  name: "autorecording", aliases: ["arec"], category: "Setting", desc: "Auto recording",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.recording){ listeners.recording=true; sock.ev.on('messages.upsert', async({messages})=>{ for(let m of messages){ if(m.key.fromMe) continue; if(settingDB.autorecording.get(m.key.remoteJid)) try{ await sock.sendPresenceUpdate("recording", m.key.remoteJid); }catch{} } }); }
    let o=(args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.autorecording.set(remote,true); return reply("✅ AutoRecording ON"); }
    if(o==="off"){ settingDB.autorecording.set(remote,false); return reply("❌ AutoRecording OFF"); }
    return reply(`${prefix}autorecording on/off`);
  }
});

// 11. ANTI-CALL
add({
  name: "anticall", category: "Setting", desc: "Anti call mode",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.call){
      listeners.call=true;
      sock.ev.on('call', async(calls)=>{
        for(let call of calls){
          if(call.status!=="offer") continue;
          for(let[jid,en]of settingDB.anticall) if(en){
            try{ await sock.rejectCall(call.id, call.from); await sock.sendMessage(call.from, {text:"*📵 Call Rejected*\nBot is in AntiCall Mode"}); }catch{}
          }
        }
      });
    }
    let o=(args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.anticall.set(remote,true); return reply("✅ AntiCall ON - Ab calls reject hongi"); }
    if(o==="off"){ settingDB.anticall.set(remote,false); return reply("❌ AntiCall OFF"); }
    return reply(`${prefix}anticall on/off`);
  }
});

// 12. OWNER NAME
add({
  name: "ownername", category: "Setting", desc: "Set owner name",
  async run({ remote, args, reply, prefix }) {
    let name = args.join(" ");
    if(!name) return reply(`Current Owner Name: *${settingDB.ownerName}*\n\n${prefix}ownername Ali`);
    settingDB.ownerName = name;
    return reply(`✅ Owner Name Set: *${name}*`);
  }
});

// 13. OWNER NUMBER
add({
  name: "ownernumber", category: "Setting", desc: "Set owner number",
  async run({ args, reply, prefix }) {
    let num = args[0];
    if(!num) return reply(`Current: ${settingDB.ownerNumber||"Not set"}\n${prefix}ownernumber 92300XXXXXXX`);
    settingDB.ownerNumber = num.replace(/[^0-9]/g,"");
    return reply(`✅ Owner Number Set: ${settingDB.ownerNumber}`);
  }
});

// 14. SET WELCOME
add({
  name: "setwelcome", category: "Setting", desc: "Set welcome msg",
  async run({ remote, args, reply, prefix }) {
    let text = args.join(" ");
    if(!text) return reply(`*SetWelcome*\nCurrent: ${settingDB.welcome.get(remote)||"Default"}\n\n${prefix}setwelcome Welcome @user to group!\n\nUse @user for mention`);
    settingDB.welcome.set(remote, text);
    return reply(`✅ Welcome Set:\n${text}`);
  }
});

// 15. SET GOODBYE
add({
  name: "setgoodbye", aliases: ["setleft"], category: "Setting", desc: "Set goodbye msg",
  async run({ remote, args, reply, prefix }) {
    let text = args.join(" ");
    if(!text) return reply(`*SetGoodbye*\nCurrent: ${settingDB.goodbye.get(remote)||"Default"}\n\n${prefix}setgoodbye Goodbye @user`);
    settingDB.goodbye.set(remote, text);
    return reply(`✅ Goodbye Set:\n${text}`);
  }
});

// 16. AUTO READ
add({
  name: "autoread", category: "Setting", desc: "Auto read msgs",
  async run({ sock, remote, args, reply, prefix }) {
    if(!listeners.read){ listeners.read=true; sock.ev.on('messages.upsert', async({messages})=>{ for(let m of messages){ if(settingDB.autoread.get(m.key.remoteJid)) try{ await sock.readMessages([m.key]); }catch{} } }); }
    let o=(args[0]||"").toLowerCase();
    if(o==="on"){ settingDB.autoread.set(remote,true); return reply("✅ AutoRead ON"); }
    if(o==="off"){ settingDB.autoread.set(remote,false); return reply("❌ AutoRead OFF"); }
    return reply(`${prefix}autoread on/off`);
  }
});

// 17. PREFIX
add({
  name: "prefix", aliases: ["setprefix"], category: "Setting", desc: "Change bot prefix",
  async run({ args, reply }) {
    let p = args[0];
    if(!p) return reply(`Current Prefix: *${settingDB.prefix}*\n\n.prefix!\n.prefix.`);
    settingDB.prefix = p;
    // agar tumhare bot me global prefix hai to yahan set karna padega
    // global.PREFIX = p;
    return reply(`✅ Prefix Changed to: *${p}*\nRestart bot if needed.`);
  }
});

// 18. SETTINGS LIST
add({
  name: "settings", category: "Setting", desc: "Show all settings",
  async run({ remote, reply, prefix }) {
    let t = `*⚙️ BOT SETTINGS*\n\n`;
    t+=`1. Antidelete: ${settingDB.antidelete.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`2. AntiStatus: ${settingDB.antistatus.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`3. StatusView: ${settingDB.statusview.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`4. StatusReact: ${settingDB.statusreact.get(remote)?.enabled?"ON ✅":"OFF ❌"}\n`;
    t+=`5. StatusLike: ${settingDB.statuslike.get(remote)?.enabled?"ON ✅":"OFF ❌"}\n`;
    t+=`6. AutoReact: ${settingDB.autoreact.get(remote)?.enabled?"ON ✅":"OFF ❌"}\n`;
    t+=`7. AlwaysOnline: ${settingDB.alwaysonline.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`8. AutoTyping: ${settingDB.autotyping.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`9. AutoRecording: ${settingDB.autorecording.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`10. AntiCall: ${settingDB.anticall.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`11. AutoRead: ${settingDB.autoread.get(remote)?"ON ✅":"OFF ❌"}\n`;
    t+=`12. Owner: ${settingDB.ownerName} - ${settingDB.ownerNumber||"Not set"}\n`;
    t+=`13. Prefix: ${settingDB.prefix}\n`;
    t+=`\nUse ${prefix}settings to see this.`;
    return reply(t);
  }
});

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
  const real = [...categories].filter(([c]) => c !== "Needs API");
  const total = real.reduce((n, [, list]) => n + list.length, 0);
  const out = [
    `╭━━━〔 *${config.botName}* 〕━━━⬣`,
    `┃ 👑 Owner : ${config.ownerName}`,
    `┃ ⚙️ Prefix : ${prefix}`,
    `┃ 🧩 Commands : ${total}`,
    `┃ 🚀 Version : ${config.version}`,
    "╰━━━━━━━━━━━━━━━━━━⬣"
  ];
  for (const [cat, list] of showAll ? [...categories] : real) {
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
  category: "Tools",
  desc: "Repeat your text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}say hello`);
    return reply(text);
  }
});

add({
  name: "reverse",
  category: "Tools",
  desc: "Reverse text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}reverse hello`);
    return reply([...text].reverse().join(""));
  }
});

add({
  name: "upper",
  category: "Tools",
  desc: "UPPERCASE text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}upper hello`);
    return reply(text.toUpperCase());
  }
});

add({
  name: "lower",
  category: "Tools",
  desc: "lowercase text",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}lower HELLO`);
    return reply(text.toLowerCase());
  }
});

add({
  name: "count",
  category: "Tools",
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
  category: "Tools",
  desc: "Encode text to Base64",
  async run({ text, prefix, reply }) {
    if (!text) return reply(`Usage: ${prefix}b64 hello`);
    return reply(Buffer.from(text, "utf8").toString("base64"));
  }
});

add({
  name: "unb64",
  category: "Tools",
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

/* ───────────── NEEDS AN EXTERNAL API ───────────── */
// These names stay registered but honestly say they are not set up,
// instead of pretending to work.

const NEEDS_API = [
  "play", "song", "video", "ytmp3", "ytmp4", "yts",
  "tiktok", "instagram", "facebook", "twitter", "mediafire", "apk",
  "pinterest", "lyrics", "weather", "translate", "tts",
  "ai", "gpt", "gemini", "imagine",
  "sticker", "toimg", "tourl", "removebg"
];

for (const name of NEEDS_API) {
  if (commands.has(name)) continue;
  add({
    name,
    category: "Needs API",
    desc: "Needs an external API/service that is not set up in this build.",
    async run({ prefix, reply }) {
      return reply(`⚠️ *${prefix}${name}* needs an external API/service which is not set up in this build yet.`);
    }
  });
}
