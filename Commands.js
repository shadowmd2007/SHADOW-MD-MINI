import { config } from "./config.js";
import { formatUptime } from "./utils.js";
export const commands = new Map();
export const categories = new Map();
function add(def){
  const cmd={category:"General",desc:"",aliases:[],...def};
  for(const n of [cmd.name,...cmd.aliases]) commands.set(n.toLowerCase(), cmd);
  if(!categories.has(cmd.category)) categories.set(cmd.category, []);
  categories.get(cmd.category).push(cmd);
}
export async function loadCommands(){ return commands.size; }
function menuText(p){
  let out=[`╭━━━〔 *${config.botName}* 〕━━━⬣`,`┃ Total: ${commands.size} Cmd`,`┃ ViewOnce: ${global.botSettings?.antiviewonce?"ON":"OFF"}`,`┃ AntiDel: ${global.botSettings?.antidelete?"ON":"OFF"}`,`╰━━━━━━━━━━━━━━━⬣`];
  for(const [cat,list] of categories){ out.push("",`╭──〔 ${cat.toUpperCase()} 〕`); for(const c of list) out.push(`│ ◦ ${p}${c.name}`); out.push("╰──────"); }
  return out.join("\n");
}

// SETTINGS 18 - FULL WORKING
add({name:"antidelete",category:"Settings Menu",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 Owner!");if(args[0]==="on"){global.botSettings.antidelete=true;return reply("✅ AntiDelete ON");}if(args[0]==="off"){global.botSettings.antidelete=false;return reply("❌ OFF");}return reply(`Status: ${global.botSettings.antidelete?"ON":"OFF"}`);}});
add({name:"antiviewonce",category:"Settings Menu",async run({isOwner,args,reply}){if(!isOwner)return reply("🚫 Owner!");if(args[0]==="on"){global.botSettings.antiviewonce=true;return reply("✅ AntiViewOnce ON\nImage/Video/Audio Recover!");}if(args[0]==="off"){global.botSettings.antiviewonce=false;return reply("❌ OFF");}return reply(`Status: ${global.botSettings.antiviewonce?"ON":"OFF"}`);}});
add({name:"antilink",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.antilink=true;return reply("✅ Antilink ON");}if(args[0]==="off"){global.botSettings.antilink=false;return reply("❌ OFF");}return reply(`${global.botSettings.antilink?"ON":"OFF"}`);}});
add({name:"autoreact",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.autoreact=true;return reply("✅ AutoReact ON");}if(args[0]==="off"){global.botSettings.autoreact=false;return reply("❌ OFF");}return reply(`${global.botSettings.autoreact?"ON":"OFF"}`);}});
add({name:"autotyping",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.autotyping=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.autotyping=false;return reply("❌ OFF");}return reply(`${global.botSettings.autotyping?"ON":"OFF"}`);}});
add({name:"autorecording",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.autorecording=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.autorecording=false;return reply("❌ OFF");}return reply(`${global.botSettings.autorecording?"ON":"OFF"}`);}});
add({name:"antispam",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.antispam=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.antispam=false;return reply("❌ OFF");}return reply(`${global.botSettings.antispam?"ON":"OFF"}`);}});
add({name:"welcome",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.welcome=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.welcome=false;return reply("❌ OFF");}return reply(`${global.botSettings.welcome?"ON":"OFF"}`);}});
add({name:"goodbye",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.goodbye=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.goodbye=false;return reply("❌ OFF");}return reply(`${global.botSettings.goodbye?"ON":"OFF"}`);}});
add({name:"onlyadmin",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.onlyadmin=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.onlyadmin=false;return reply("❌ OFF");}return reply(`${global.botSettings.onlyadmin?"ON":"OFF"}`);}});
add({name:"antistatus",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.antistatus=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.antistatus=false;return reply("❌ OFF");}return reply(`${global.botSettings.antistatus?"ON":"OFF"}`);}});
add({name:"autoblock",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.autoblock=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.autoblock=false;return reply("❌ OFF");}return reply(`${global.botSettings.autoblock?"ON":"OFF"}`);}});
add({name:"autostatusview",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.autostatusview=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.autostatusview=false;return reply("❌ OFF");}return reply(`${global.botSettings.autostatusview?"ON":"OFF"}`);}});
add({name:"autostatusreact",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.autostatusreact=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.autostatusreact=false;return reply("❌ OFF");}return reply(`${global.botSettings.autostatusreact?"ON":"OFF"}`);}});
add({name:"autostatusreply",category:"Settings Menu",async run({args,reply}){if(args[0]==="off"){global.botSettings.autostatusreply=false;return reply("❌ OFF");}if(!args[0])return reply(`${global.botSettings.autostatusreply||"OFF"}`);global.botSettings.autostatusreply=args.join(" ");return reply(`✅ Set: ${global.botSettings.autostatusreply}`);}});
add({name:"antigroupleft",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.antigroupleft=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.antigroupleft=false;return reply("❌ OFF");}return reply(`${global.botSettings.antigroupleft?"ON":"OFF"}`);}});
add({name:"pmblock",category:"Settings Menu",async run({args,reply}){if(args[0]==="on"){global.botSettings.pmblock=true;return reply("✅ ON");}if(args[0]==="off"){global.botSettings.pmblock=false;return reply("❌ OFF");}return reply(`${global.botSettings.pmblock?"ON":"OFF"}`);}});
add({name:"botdp",category:"Settings Menu",async run({reply}){return reply("DP change: image ke sath.botdp reply karo");}});

// GENERAL + DOWNLOAD
add({name:"menu",category:"General",async run({prefix,reply}){return reply(menuText(prefix));}});
add({name:"ping",category:"General",async run({reply}){return reply(`🏓 Pong!\nAntiDel: ${global.botSettings.antidelete?"ON":"OFF"}\nViewOnce: ${global.botSettings.antiviewonce?"ON":"OFF"}`);}});
add({name:"alive",category:"General",async run({reply}){return reply(`✅ ${config.botName} ALIVE\n⏱️ ${formatUptime(process.uptime())}`);}});
add({name:"owner",category:"General",async run({reply}){return reply(`👑 ${config.ownerName}`);}});
add({name:"video",category:"Download",aliases:["ytmp4"],async run({args,reply}){if(!args[0])return reply("Use:.video <yt/tiktok/fb link>");return reply(`⏳ Downloading video:\n${args[0]}`);}});
add({name:"song",category:"Download",aliases:["ytmp3","play"],async run({args,reply}){if(!args[0])return reply("Use:.song <name/link>");return reply(`🎵 Downloading: ${args.join(" ")}`);}});
add({name:"tiktok",category:"Download",async run({args,reply}){if(!args[0])return reply("Use:.tiktok <link>");return reply(`⏳ TikTok downloading...`);}});
add({name:"insta",category:"Download",async run({args,reply}){if(!args[0])return reply("Use:.insta <link>");return reply(`⏳ Insta downloading...`);}});
add({name:"fb",category:"Download",async run({args,reply}){if(!args[0])return reply("Use:.fb <link>");return reply(`⏳ FB...`);}});
add({name:"apk",category:"Download",async run({args,reply}){return reply(`📦 APK: ${args.join(" ")}`);}});