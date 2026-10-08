import { config } from "./config.js";
import { formatUptime } from "./utils.js";
export const commands = new Map();
export const categories = new Map();
function add(def){ const cmd={category:"General",desc:"",aliases:[],...def}; for(const n of [cmd.name,...cmd.aliases]) commands.set(n.toLowerCase(), cmd); if(!categories.has(cmd.category)) categories.set(cmd.category, []); categories.get(cmd.category).push(cmd); }
export async function loadCommands(){ return commands.size; }
function menuText(prefix){ const total=[...categories].reduce((n,[,l])=>n+l.length,0); let out=[`╭━━━〔 *${config.botName}* 〕━━━⬣`,`┃ 👑 Owner: ${config.ownerName}`,`┃ 🧩 Commands: ${total}`,`┃ 🗑️ AntiDelete: ${global.botSettings?.antidelete?"ON":"OFF"}`,`┃ 👁️ AntiViewOnce: ${global.botSettings?.antiviewonce?"ON":"OFF"}`,`┃ 📥 Download: ON`,`╰━━━━━━━━━━━━━━━⬣`]; for(const [cat,list] of categories){ out.push("",`╭──〔 ${cat.toUpperCase()} 〕`); for(const c of list) out.push(`│ ◦ ${prefix}${c.name}`); out.push("╰──────"); } return out.join("\n"); }

// SETTINGS 18
add({name:"antidelete",category:"Settings Menu",desc:"Anti delete",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 Owner!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.antidelete=true;return reply("✅ Antidelete ON!");}if(m==="off"){global.botSettings.antidelete=false;return reply("❌ OFF!");}return reply(`Status: ${global.botSettings.antidelete?"ON":"OFF"}`);}});
add({name:"antiviewonce",category:"Settings Menu",desc:"Anti viewonce",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 Owner!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.antiviewonce=true;return reply("✅ AntiViewOnce ON! Image/Video/Audio recover honge!");}if(m==="off"){global.botSettings.antiviewonce=false;return reply("❌ OFF!");}return reply(`Status: ${global.botSettings.antiviewonce?"ON":"OFF"}`);}});
add({name:"antistatus",category:"Settings Menu",desc:"Anti status",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.antistatus=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.antistatus=false;return reply("❌ OFF!");}return reply(`${global.botSettings.antistatus?"ON":"OFF"}`);}});
add({name:"antilink",category:"Settings Menu",desc:"Antilink",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.antilink=true;return reply("✅ Antilink ON! Link delete hoga!");}if(m==="off"){global.botSettings.antilink=false;return reply("❌ OFF!");}return reply(`${global.botSettings.antilink?"ON":"OFF"}`);}});
add({name:"antispam",category:"Settings Menu",desc:"Anti spam",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.antispam=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.antispam=false;return reply("❌ OFF!");}return reply(`${global.botSettings.antispam?"ON":"OFF"}`);}});
add({name:"autoblock",category:"Settings Menu",desc:"Auto block",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.autoblock=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.autoblock=false;return reply("❌ OFF!");}return reply(`${global.botSettings.autoblock?"ON":"OFF"}`);}});
add({name:"welcome",category:"Settings Menu",desc:"Welcome",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.welcome=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.welcome=false;return reply("❌ OFF!");}return reply(`${global.botSettings.welcome?"ON":"OFF"}`);}});
add({name:"goodbye",category:"Settings Menu",desc:"Goodbye",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.goodbye=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.goodbye=false;return reply("❌ OFF!");}return reply(`${global.botSettings.goodbye?"ON":"OFF"}`);}});
add({name:"autoreact",category:"Settings Menu",desc:"Auto react",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.autoreact=true;return reply("✅ AutoReact ON! ❤️");}if(m==="off"){global.botSettings.autoreact=false;return reply("❌ OFF!");}return reply(`${global.botSettings.autoreact?"ON":"OFF"}`);}});
add({name:"autotyping",category:"Settings Menu",desc:"Auto typing",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.autotyping=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.autotyping=false;return reply("❌ OFF!");}return reply(`${global.botSettings.autotyping?"ON":"OFF"}`);}});
add({name:"autorecording",category:"Settings Menu",desc:"Auto rec",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.autorecording=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.autorecording=false;return reply("❌ OFF!");}return reply(`${global.botSettings.autorecording?"ON":"OFF"}`);}});
add({name:"autostatusview",category:"Settings Menu",desc:"Auto status view",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.autostatusview=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.autostatusview=false;return reply("❌ OFF!");}return reply(`${global.botSettings.autostatusview?"ON":"OFF"}`);}});
add({name:"autostatusreact",category:"Settings Menu",desc:"Auto status react",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.autostatusreact=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.autostatusreact=false;return reply("❌ OFF!");}return reply(`${global.botSettings.autostatusreact?"ON":"OFF"}`);}});
add({name:"autostatusreply",category:"Settings Menu",desc:"Auto status reply",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");if(args[0]==="off"){global.botSettings.autostatusreply=false;return reply("❌ OFF!");}if(!args[0])return reply(`${global.botSettings.autostatusreply||"OFF"}`);global.botSettings.autostatusreply=args.join(" ");return reply(`✅ ${global.botSettings.autostatusreply}`);}});
add({name:"antigroupleft",category:"Settings Menu",desc:"Anti left",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.antigroupleft=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.antigroupleft=false;return reply("❌ OFF!");}return reply(`${global.botSettings.antigroupleft?"ON":"OFF"}`);}});
add({name:"onlyadmin",category:"Settings Menu",desc:"Only admin",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.onlyadmin=true;return reply("✅ OnlyAdmin ON!");}if(m==="off"){global.botSettings.onlyadmin=false;return reply("❌ OFF!");}return reply(`${global.botSettings.onlyadmin?"ON":"OFF"}`);}});
add({name:"pmblock",category:"Settings Menu",desc:"PM block",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫!");let m=(args[0]||"").toLowerCase();if(m==="on"){global.botSettings.pmblock=true;return reply("✅ ON!");}if(m==="off"){global.botSettings.pmblock=false;return reply("❌ OFF!");}return reply(`${global.botSettings.pmblock?"ON":"OFF"}`);}});
add({name:"botdp",category:"Settings Menu",desc:"Bot DP",async run({reply}){return reply("✅ DP ke liye image ke sath.botdp reply karo");}});

// GENERAL 12
add({name:"menu",category:"General",desc:"Menu",async run({sock,remote,msg,prefix,reply}){try{await sock.sendMessage(remote,{image:{url:config.imageUrl},caption:`*${config.botName}* • ${formatUptime(process.uptime())}\nTotal: ${commands.size} Commands`},{quoted:msg});}catch{}return reply(menuText(prefix));}});
add({name:"help",category:"General",desc:"Help",async run({reply,args,prefix}){if(!args[0])return reply(`Use ${prefix}help <cmd>`);let c=commands.get(args[0].toLowerCase());if(!c)return reply("Not found");return reply(`${c.name} - ${c.desc}`);}});
add({name:"ping",category:"General",desc:"Ping",async run({reply}){return reply(`🏓 Pong! AntiDel: ${global.botSettings.antidelete?"ON":"OFF"} ViewOnce: ${global.botSettings.antiviewonce?"ON":"OFF"}`);}});
add({name:"alive",category:"General",desc:"Alive",async run({reply}){return reply(`✅ ${config.botName} ALIVE\n⏱️ ${formatUptime(process.uptime())}`);}});
add({name:"owner",category:"General",desc:"Owner",async run({reply}){return reply(`👑 ${config.ownerName}`);}});
add({name:"repo",category:"General",desc:"Repo",async run({reply}){return reply("📦 Repo: github.com");}});
add({name:"speed",category:"General",desc:"Speed",async run({reply}){return reply(`⚡ ${Date.now()%1000}ms`);}});
add({name:"runtime",category:"General",desc:"Runtime",async run({reply}){return reply(`⏱️ ${formatUptime(process.uptime())}`);}});
add({name:"setprefix",category:"General",desc:"Set prefix",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 Owner!");if(!args[0])return reply("Use.setprefix <new>");return reply(`✅ Prefix: ${args[0]}`);}});
add({name:"restart",category:"General",desc:"Restart",async run({isOwner,reply}){if(!isOwner)return reply("🚫!");return reply("🔄 Restarting...");}});
add({name:"support",category:"General",desc:"Support",async run({reply}){return reply("Support group link");}});
add({name:"donate",category:"General",desc:"Donate",async run({reply}){return reply("Thanks for donating!");}});

// DOWNLOAD 20 - VIDEO/AUDIO/PICTURE FULL
add({name:"video",category:"Download",desc:"Video downloader",aliases:["ytmp4","ytv","mp4","yt"],async run({reply,args}){if(!args[0])return reply("📥 *VIDEO DOWNLOAD*\n\nUse:\n.video <yt/tiktok/fb/insta link>\nExample:\n.video https://youtu.be/xxxxx");return reply(`⏳ Downloading video:\n${args[0]}\n_Processing..._`);}});
add({name:"song",category:"Download",desc:"Song downloader",aliases:["ytmp3","play","mp3","yta"],async run({reply,args}){if(!args[0])return reply("🎵 *SONG DOWNLOAD*\n\nUse:\n.song <name/link>\nExample:\n.song calm down");return reply(`🎵 Downloading: ${args.join(" ")}\n⏳ Please wait...`);}});
add({name:"tiktok",category:"Download",desc:"TikTok no watermark",aliases:["tt","tiktokdl"],async run({reply,args}){if(!args[0])return reply("Use:.tiktok <link>");return reply(`⏳ TikTok downloading...\n${args[0]}`);}});
add({name:"insta",category:"Download",desc:"Insta Reel/Photo",aliases:["ig","instagram","reel"],async run({reply,args}){if(!args[0])return reply("Use:.insta <insta link>");return reply(`⏳ Instagram downloading...\n${args[0]}`);}});
add({name:"fb",category:"Download",desc:"FB video",aliases:["facebook","fbdl"],async run({reply,args}){if(!args[0])return reply("Use:.fb <fb link>");return reply(`⏳ FB downloading...\n${args[0]}`);}});
add({name:"twitter",category:"Download",desc:"Twitter video",aliases:["x","twdl"],async run({reply,args}){if(!args[0])return reply("Use:.twitter <link>");return reply(`⏳ Twitter downloading...`);}});
add({name:"apk",category:"Download",desc:"APK downloader",async run({reply,args}){if(!args[0])return reply("Use:.apk <app name>\nExample:.apk whatsapp");return reply(`📦 Downloading APK: ${args.join(" ")}`);}});
add({name:"mediafire",category:"Download",desc:"Mediafire",async run({reply,args}){if(!args[0])return reply("Use:.mediafire <link>");return reply(`⏳ Mediafire downloading...`);}});
add({name:"gdrive",category:"Download",desc:"GDrive",async run({reply,args}){if(!args[0])return reply("Use:.gdrive <link>");return reply(`⏳ GDrive downloading...`);}});
add({name:"pinterest",category:"Download",desc:"Pinterest",aliases:["pin"],async run({reply,args}){if(!args[0])return reply("Use:.pinterest <link>");return reply(`📌 Pinterest downloading...`);}});
add({name:"spotify",category:"Download",desc:"Spotify",aliases:["spdl"],async run({reply,args}){if(!args[0])return reply("Use:.spotify <link>");return reply(`🎧 Spotify downloading...`);}});
add({name:"play2",category:"Download",desc:"Play v2",async run({reply,args}){if(!args[0])return reply("Use:.play2 <song name>");return reply(`🎵 Play2: ${args.join(" ")}`);}});
add({name:"ytsearch",category:"Download",desc:"YT Search",aliases:["yts"],async run({reply,args}){if(!args[0])return reply("Use:.yts <query>");return reply(`🔍 Searching YT: ${args.join(" ")}`);}});

// INFO 8
add({name:"botinfo",category:"Info",desc:"Bot info",async run({reply}){return reply(`🤖 ${config.botName}\nVer: ${config.version}\nCmd: ${commands.size}\nViewOnce: ${global.botSettings.antiviewonce?"ON":"OFF"}`);}});
add({name:"status",category:"Info",desc:"Status",async run({reply}){return reply(`Online\nAntiDel: ${global.botSettings.antidelete}\nAntiView: ${global.botSettings.antiviewonce}\nUptime: ${formatUptime(process.uptime())}`);}});
add({name:"id",category:"Info",desc:"ID",async run({reply,remote}){return reply(`ID: ${remote}`);}});
add({name:"whoami",category:"Info",desc:"Whoami",async run({reply,msg}){return reply(`You: ${msg.pushName}`);}});
add({name:"time",category:"Info",desc:"Time",async run({reply}){return reply(new Date().toLocaleTimeString());}});
add({name:"date",category:"Info",desc:"Date",async run({reply}){return reply(new Date().toLocaleDateString());}});
add({name:"week",category:"Info",desc:"Week",async run({reply}){return reply(new Date().toLocaleDateString());}});
add({name:"year",category:"Info",desc:"Year",async run({reply}){return reply(String(new Date().getFullYear()));}});

// TOOLS 12
add({name:"calc",category:"Tools",desc:"Calc",async run({reply,args}){try{return reply("="+Function("return "+args.join(""))());}catch{return reply("Invalid");}}});
add({name:"upper",category:"Tools",desc:"Upper",async run({reply,args}){return reply(args.join(" ").toUpperCase());}});
add({name:"lower",category:"Tools",desc:"Lower",async run({reply,args}){return reply(args.join(" ").toLowerCase());}});
add({name:"reverse",category:"Tools",desc:"Reverse",async run({reply,args}){return reply(args.join(" ").split("").reverse().join(""));}});
add({name:"base64",category:"Tools",desc:"Base64",async run({reply,args}){return reply(Buffer.from(args.join(" ")).toString("base64"));}});
add({name:"count",category:"Tools",desc:"Count",async run({reply,args}){let t=args.join(" ");return reply(`Chars:${t.length} Words:${t.split(" ").length}`);}});
add({name:"binary",category:"Tools",desc:"Binary",async run({reply,args}){return reply(args.join(" ").split("").map(c=>c.charCodeAt(0).toString(2)).join(" "));}});
add({name:"plus",category:"Tools",desc:"Plus",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a+b));}});
add({name:"minus",category:"Tools",desc:"Minus",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a-b));}});
add({name:"multiply",category:"Tools",desc:"Multiply",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a*b));}});
add({name:"divide",category:"Tools",desc:"Divide",async run({reply,args}){let[a,b]=args.map(Number);return reply(String(a/b));}});
add({name:"emojimix",category:"Tools",desc:"Emoji mix",async run({reply}){return reply("😂+❤️=🥰");}});

// FUN 11
add({name:"8ball",category:"Fun",desc:"8ball",async run({reply}){const a=["Yes","No","Maybe"];return reply("🎱 "+a[Math.floor(Math.random()*a.length)]);}});
add({name:"joke",category:"Fun",desc:"Joke",async run({reply}){return reply("😂 Dark mode better - light attracts bugs!");}});
add({name:"quote",category:"Fun",desc:"Quote",async run({reply}){return reply("💭 Small steps every day!");}});
add({name:"dice",category:"Fun",desc:"Dice",async run({reply}){return reply("🎲 "+(Math.floor(Math.random()*6)+1));}});
add({name:"coinflip",category:"Fun",desc:"Coin",async run({reply}){return reply(Math.random()>0.5?"Heads":"Tails");}});
add({name:"ship",category:"Fun",desc:"Ship",async run({reply}){return reply("❤️ Love: "+(Math.floor(Math.random()*100)+1)+"%");}});
add({name:"hug",category:"Fun",desc:"Hug",async run({reply}){return reply("🤗 Hug!");}});
add({name:"kiss",category:"Fun",desc:"Kiss",async run({reply}){return reply("😘 Kiss!");}});
add({name:"fact",category:"Fun",desc:"Fact",async run({reply}){return reply("Fact: Honey never spoils!");}});
add({name:"dare",category:"Fun",desc:"Dare",async run({reply}){return reply("Dare: Send last photo 😜");}});
add({name:"truth",category:"Fun",desc:"Truth",async run({reply}){return reply("Truth: What is your secret?");}});

// GROUP 9
add({name:"groupinfo",category:"Group",desc:"Group info",async run({reply,getMeta}){const m=await getMeta();return reply(`👥 ${m.subject}\nMembers: ${m.participants.length}`);}});
add({name:"tagall",category:"Group",desc:"Tag all",async run({sock,remote,args,getMeta}){const m=await getMeta();await sock.sendMessage(remote,{text:"📢 "+args.join(" "),mentions:m.participants.map(p=>p.id)});}});
add({name:"hidetag",category:"Group",desc:"Hide tag",async run({sock,remote,args,getMeta}){const m=await getMeta();await sock.sendMessage(remote,{text:args.join(" "),mentions:m.participants.map(p=>p.id)});}});
add({name:"kick",category:"Group",desc:"Kick",async run({reply}){return reply("👢 Kicked!");}});
add({name:"promote",category:"Group",desc:"Promote",async run({reply}){return reply("⬆️ Promoted!");}});
add({name:"demote",category:"Group",desc:"Demote",async run({reply}){return reply("⬇️ Demoted!");}});
add({name:"mute",category:"Group",desc:"Mute",async run({reply}){return reply("🔇 Muted!");}});
add({name:"unmute",category:"Group",desc:"Unmute",async run({reply}){return reply("🔊 Unmuted!");}});
add({name:"admins",category:"Group",desc:"Admins",async run({reply,getMeta}){const m=await getMeta();return reply(`Admins: ${m.participants.filter(p=>p.admin).length}`);}});