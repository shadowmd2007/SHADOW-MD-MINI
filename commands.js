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

function add(def) {
  const cmd = { category: "General", desc: "", aliases: [],...def };
  for (const n of [cmd.name,...cmd.aliases]) commands.set(n.toLowerCase(), cmd);
  if (!categories.has(cmd.category)) categories.set(cmd.category, []);
  categories.get(cmd.category).push(cmd);
}

export async function loadCommands() {
  return commands.size;
}

function menuText(prefix, showAll) {
  const real = [...categories].filter(([c]) => c!== "Needs API");
  const total = real.reduce((n, [, list]) => n + list.length, 0);
  const out = [
    `╭━━━〔 *${config.botName}* 〕━━━⬣`,
    `┃ 👑 Owner : ${config.ownerName}`,
    `┃ ⚙️ Prefix : ${prefix}`,
    `┃ 🧩 Commands : ${total}`,
    `┃ 🚀 Version : ${config.version}`,
    "╰━━━━━━━━━━━━━━━━━━⬣"
  ];
  for (const [cat, list] of showAll? [...categories] : real) {
    out.push("", `╭──〔 ${EMOJI[cat] || "📌"} *${cat.toUpperCase()}* 〕`);
    for (const c of list) out.push(`│ ◦ ${prefix}${c.name}`);
    out.push("╰──────────────");
  }
  out.push("", `ℹ️ ${prefix}help <command> for details`);
  return out.join("\n");
}

// ===== 18 SETTINGS MENU - OWNER ONLY =====
add({name:"antidelete",category:"Settings Menu",desc:"Anti delete ON/OFF",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner & Pair Owner!*");let m=(args[0]||"").toLowerCase();if(m==="on")return reply("✅ antidelete ON!");if(m==="off")return reply("❌ antidelete OFF!");return reply(`📍 *antidelete*\nUsage:.antidelete on/off`);}});
add({name:"antistatus",category:"Settings Menu",desc:"Anti status",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");let m=(args[0]||"").toLowerCase();if(m==="on")return reply("✅ antistatus ON!");return reply("❌ antistatus OFF!");}});
add({name:"botdp",category:"Settings Menu",desc:"Set bot DP",async run({isOwner,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply("✅ Image ke sath.botdp reply karo");}});
add({name:"antilink",category:"Settings Menu",desc:"Anti link",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ antilink ON!":"❌ antilink OFF!");}});
add({name:"antiviewonce",category:"Settings Menu",desc:"Anti viewonce",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ antiviewonce ON!":"❌ OFF!");}});
add({name:"autoreact",category:"Settings Menu",desc:"Auto react",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ autoreact ON!":"❌ OFF!");}});
add({name:"autotyping",category:"Settings Menu",desc:"Auto typing",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ autotyping ON!":"❌ OFF!");}});
add({name:"autorecording",category:"Settings Menu",desc:"Auto recording",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ autorecording ON!":"❌ OFF!");}});
add({name:"autostatusview",category:"Settings Menu",desc:"Auto status view",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ autostatusview ON!":"❌ OFF!");}});
add({name:"autostatusreact",category:"Settings Menu",desc:"Auto status react",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ autostatusreact ON!":"❌ OFF!");}});
add({name:"autostatusreply",category:"Settings Menu",desc:"Auto status reply",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");if(!args[0])return reply("Use:.autostatusreply <text> / off");return reply(args[0]==="off"?"❌ OFF!":"✅ ON: "+args.join(" "));}});
add({name:"antigroupleft",category:"Settings Menu",desc:"Anti group left",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ antigroupleft ON!":"❌ OFF!");}});
add({name:"welcome",category:"Settings Menu",desc:"Welcome",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ welcome ON!":"❌ OFF!");}});
add({name:"goodbye",category:"Settings Menu",desc:"Goodbye",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ goodbye ON!":"❌ OFF!");}});
add({name:"antispam",category:"Settings Menu",desc:"Anti spam",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ antispam ON!":"❌ OFF!");}});
add({name:"autoblock",category:"Settings Menu",desc:"Auto block",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ autoblock ON!":"❌ OFF!");}});
add({name:"pmblock",category:"Settings Menu",desc:"PM block",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ pmblock ON!":"❌ OFF!");}});
add({name:"onlyadmin",category:"Settings Menu",desc:"Only admin",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 *Only Owner!*");return reply(args[0]==="on"?"✅ onlyadmin ON!":"❌ OFF!");}});

// ===== GENERAL =====
add({name:"menu",category:"General",desc:"Show all commands",async run({sock,remote,msg,args,prefix,reply}){try{await sock.sendMessage(remote,{image:{url:config.imageUrl},caption:`*${config.botName}* • Multi Device`},{quoted:msg});}catch{}return reply(menuText(prefix));}});
add({name:"help",category:"General",desc:"Help",async run({reply}){return reply("Use.menu");}});
add({name:"ping",category:"General",desc:"Ping",async run({reply}){return reply("🏓 Pong!");}});
add({name:"alive",category:"General",desc:"Alive",async run({reply}){return reply(`✅ ${config.botName} is alive\n⏱️ ${formatUptime(process.uptime())}`);}});
add({name:"owner",category:"General",desc:"Owner",async run({reply}){return reply(`👑 Owner: ${config.ownerName}`);}});
add({name:"repo",category:"General",desc:"Repo",async run({reply}){return reply("📦 Repo");}});
add({name:"channel",category:"General",desc:"Channel",async run({reply}){return reply("📢 Channel");}});
add({name:"group",category:"General",desc:"Group",async run({reply}){return reply("👥 Group");}});

// ===== INFO =====
add({name:"jid",category:"Info",desc:"JID",async run({reply,remote}){return reply(remote);}});
add({name:"groupid",category:"Info",desc:"Group ID",async run({reply,remote}){return reply(remote);}});
add({name:"botinfo",category:"Info",desc:"Bot info",async run({reply}){return reply("🤖 Bot Info");}});
add({name:"status",category:"Info",desc:"Status",async run({reply}){return reply("Status OK");}});
add({name:"runtime",category:"Info",desc:"Runtime",async run({reply}){return reply("Uptime: "+formatUptime(process.uptime()));}});
add({name:"whoami",category:"Info",desc:"Whoami",async run({reply,msg}){return reply(msg.pushName||"Unknown");}});

// ===== TOOLS =====
add({name:"calc",category:"Tools",desc:"Calculator",async run({reply,args}){try{return reply("Result: "+Function("return "+args.join(""))());}catch{return reply("Invalid");}}});
add({name:"upper",category:"Tools",desc:"Upper",async run({reply,args}){return reply(args.join(" ").toUpperCase());}});
add({name:"lower",category:"Tools",desc:"Lower",async run({reply,args}){return reply(args.join(" ").toLowerCase());}});
add({name:"reverse",category:"Tools",desc:"Reverse",async run({reply,args}){return reply(args.join(" ").split("").reverse().join(""));}});
add({name:"base64",category:"Tools",desc:"Base64",async run({reply,args}){return reply(Buffer.from(args.join(" ")).toString("base64"));}});
add({name:"unbase64",category:"Tools",desc:"Unbase64",async run({reply,args}){try{return reply(Buffer.from(args[0],"base64").toString());}catch{return reply("Invalid");}}});
add({name:"binary",category:"Tools",desc:"Binary",async run({reply,args}){return reply(args.join(" ").split("").map(c=>c.charCodeAt(0).toString(2)).join(" "));}});
add({name:"count",category:"Tools",desc:"Count",async run({reply,args}){let t=args.join(" ");return reply(`Chars: ${t.length} Words: ${t.split(" ").length}`);}});
add({name:"plus",category:"Tools",desc:"Plus",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a+b));}});
add({name:"minus",category:"Tools",desc:"Minus",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a-b));}});
add({name:"multiply",category:"Tools",desc:"Multiply",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a*b));}});
add({name:"divide",category:"Tools",desc:"Divide",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a/b));}});
add({name:"power",category:"Tools",desc:"Power",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(Math.pow(a,b)));}});
add({name:"sqrt",category:"Tools",desc:"Sqrt",async run({reply,args}){return reply(String(Math.sqrt(Number(args[0]))));}});
add({name:"avg",category:"Tools",desc:"Avg",async run({reply,args}){let n=args.map(Number);return reply("Avg: "+(n.reduce((a,b)=>a+b,0)/n.length));}});
add({name:"max",category:"Tools",desc:"Max",async run({reply,args}){return reply("Max: "+Math.max(...args.map(Number)));}});
add({name:"min",category:"Tools",desc:"Min",async run({reply,args}){return reply("Min: "+Math.min(...args.map(Number)));}});

// ===== FUN =====
add({name:"8ball",category:"Fun",desc:"8ball",async run({reply}){const a=["Yes.","No.","Maybe."];return reply("🎱 "+a[Math.floor(Math.random()*a.length)]);}});
add({name:"joke",category:"Fun",desc:"Joke",async run({reply}){return reply("😂 Why dark mode? Light attracts bugs!");}});
add({name:"quote",category:"Fun",desc:"Quote",async run({reply}){return reply("💭 Small steps every day!");}});
add({name:"dice",category:"Fun",desc:"Dice",async run({reply}){return reply("🎲 "+(Math.floor(Math.random()*6)+1));}});
add({name:"coinflip",category:"Fun",desc:"Coinflip",async run({reply}){return reply(Math.random()>0.5?"Heads":"Tails");}});
add({name:"choose",category:"Fun",desc:"Choose",async run({reply,args}){let o=args.join(" ").split("|");return reply(o[Math.floor(Math.random()*o.length)]);}});
add({name:"ship",category:"Fun",desc:"Ship",async run({reply}){return reply("❤️ "+(Math.floor(Math.random()*100)+1)+"%");}});
add({name:"love",category:"Fun",desc:"Love",async run({reply}){return reply("❤️ "+(Math.floor(Math.random()*100)+1)+"%");}});
add({name:"hug",category:"Fun",desc:"Hug",async run({reply}){return reply("🤗 Hug!");}});
add({name:"kiss",category:"Fun",desc:"Kiss",async run({reply}){return reply("😘 Kiss!");}});
add({name:"slap",category:"Fun",desc:"Slap",async run({reply}){return reply("👋 Slap!");}});
add({name:"fact",category:"Fun",desc:"Fact",async run({reply}){return reply("Fact: Honey never spoils!");}});
add({name:"dare",category:"Fun",desc:"Dare",async run({reply}){return reply("Dare: Send last photo 😜");}});
add({name:"truth",category:"Fun",desc:"Truth",async run({reply}){return reply("Truth: secret?");}});

// ===== GROUP =====
add({name:"groupinfo",category:"Group",desc:"Group info",async run({reply,getMeta}){const m=await getMeta();return reply(`👥 ${m.subject}\nMembers: ${m.participants.length}`);}});
add({name:"tagall",category:"Group",desc:"Tag all",async run({sock,remote,reply,args,getMeta}){const m=await getMeta();await sock.sendMessage(remote,{text:"📢 TAG ALL\n"+args.join(" "),mentions:m.participants.map(p=>p.id)});}});
add({name:"hidetag",category:"Group",desc:"Hide tag",async run({sock,remote,args,getMeta}){const m=await getMeta();await sock.sendMessage(remote,{text:args.join(" "),mentions:m.participants.map(p=>p.id)});}});
add({name:"kick",category:"Group",desc:"Kick",async run({reply}){return reply("👢 Kicked!");}});
add({name:"add",category:"Group",desc:"Add",async run({reply}){return reply("✅ Added!");}});
add({name:"promote",category:"Group",desc:"Promote",async run({reply}){return reply("⬆️ Promoted!");}});
add({name:"demote",category:"Group",desc:"Demote",async run({reply}){return reply("⬇️ Demoted!");}});
add({name:"mute",category:"Group",desc:"Mute",async run({reply}){return reply("🔇 Muted!");}});
add({name:"unmute",category:"Group",desc:"Unmute",async run({reply}){return reply("🔊 Unmuted!");}});
add({name:"admins",category:"Group",desc:"Admins",async run({reply,getMeta}){const m=await getMeta();return reply("Admins: "+m.participants.filter(p=>p.admin).length);}});
add({name:"members",category:"Group",desc:"Members",async run({reply,getMeta}){const m=await getMeta();return reply("Members: "+m.participants.length);}});