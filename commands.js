export const commands = new Map();
export const categories = new Map();
function add(d){ const c={category:"General",aliases:[],...d}; for(const n of [c.name,...c.aliases]) commands.set(n.toLowerCase(),c); if(!categories.has(c.category)) categories.set(c.category,[]); categories.get(c.category).push(c); }
export async function loadCommands(){ return commands.size; }

// 1-18 SETTINGS ON/OFF
add({name:"antidelete",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.antidelete=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.antidelete=false;return reply("❌ OFF");} return reply(global.botSettings.antidelete?"ON":"OFF"); }});
add({name:"antiviewonce",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.antiviewonce=true;return reply("✅ AntiViewOnce ON");} if(args[0]==="off"){global.botSettings.antiviewonce=false;return reply("❌ OFF");} return reply(global.botSettings.antiviewonce?"ON":"OFF"); }});
add({name:"antilink",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.antilink=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.antilink=false;return reply("❌ OFF");} return reply(global.botSettings.antilink?"ON":"OFF"); }});
add({name:"autoreact",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.autoreact=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.autoreact=false;return reply("❌ OFF");} return reply(global.botSettings.autoreact?"ON":"OFF"); }});
add({name:"autotyping",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.autotyping=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.autotyping=false;return reply("❌ OFF");} return reply(global.botSettings.autotyping?"ON":"OFF"); }});
add({name:"autorecording",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.autorecording=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.autorecording=false;return reply("❌ OFF");} return reply(global.botSettings.autorecording?"ON":"OFF"); }});
add({name:"antispam",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.antispam=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.antispam=false;return reply("❌ OFF");} return reply(global.botSettings.antispam?"ON":"OFF"); }});
add({name:"welcome",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.welcome=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.welcome=false;return reply("❌ OFF");} return reply(global.botSettings.welcome?"ON":"OFF"); }});
add({name:"goodbye",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.goodbye=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.goodbye=false;return reply("❌ OFF");} return reply(global.botSettings.goodbye?"ON":"OFF"); }});
add({name:"onlyadmin",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.onlyadmin=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.onlyadmin=false;return reply("❌ OFF");} return reply(global.botSettings.onlyadmin?"ON":"OFF"); }});
add({name:"antistatus",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.antistatus=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.antistatus=false;return reply("❌ OFF");} return reply(global.botSettings.antistatus?"ON":"OFF"); }});
add({name:"autoblock",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.autoblock=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.autoblock=false;return reply("❌ OFF");} return reply(global.botSettings.autoblock?"ON":"OFF"); }});
add({name:"autostatusview",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.autostatusview=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.autostatusview=false;return reply("❌ OFF");} return reply(global.botSettings.autostatusview?"ON":"OFF"); }});
add({name:"autostatusreact",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.autostatusreact=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.autostatusreact=false;return reply("❌ OFF");} return reply(global.botSettings.autostatusreact?"ON":"OFF"); }});
add({name:"antigroupleft",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.antigroupleft=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.antigroupleft=false;return reply("❌ OFF");} return reply(global.botSettings.antigroupleft?"ON":"OFF"); }});
add({name:"pmblock",category:"Settings",async run({args,reply}){ if(args[0]==="on"){global.botSettings.pmblock=true;return reply("✅ ON");} if(args[0]==="off"){global.botSettings.pmblock=false;return reply("❌ OFF");} return reply(global.botSettings.pmblock?"ON":"OFF"); }});
add({name:"autostatusreply",category:"Settings",async run({args,reply}){ if(args[0]==="off"){global.botSettings.autostatusreply=false;return reply("❌ OFF");} if(!args[0])return reply(global.botSettings.autostatusreply||"OFF"); global.botSettings.autostatusreply=args.join(" "); return reply("✅ Set:"+global.botSettings.autostatusreply); }});
add({name:"botdp",category:"Settings",async run({reply}){ return reply("DP change: image ke sath.botdp"); }});

// 19-37 GENERAL
add({name:"menu",category:"General",async run({reply}){ return reply("SHADOW-MD 37 CMDS:\n.antidelete.antiviewonce.antilink.autoreact.autotyping.autorecording.antispam.welcome.goodbye.onlyadmin.antistatus.autoblock.autostatusview.autostatusreact.antigroupleft.pmblock.autostatusreply.botdp\n.menu.ping.alive.owner.video.song.tiktok.insta.fb.apk.pinterest.spotify.mediafire.gdrive.sticker.toimg.kick.promote.demote"); }});
add({name:"ping",category:"General",async run({reply}){ return reply("Pong! View:"+global.botSettings.antiviewonce+" Del:"+global.botSettings.antidelete); }});
add({name:"alive",category:"General",async run({reply}){ return reply("SHADOW-MD ALIVE 37 CMDS ✅"); }});
add({name:"owner",category:"General",async run({reply}){ return reply("Owner: Shadow"); }});
add({name:"video",category:"Download",async run({args,reply}){ return reply("Video: "+(args[0]||"link do")); }});
add({name:"song",category:"Download",async run({args,reply}){ return reply("Song: "+args.join(" ")); }});
add({name:"tiktok",category:"Download",async run({reply}){ return reply("TikTok DL..."); }});
add({name:"insta",category:"Download",async run({reply}){ return reply("Insta DL..."); }});
add({name:"fb",category:"Download",async run({reply}){ return reply("FB DL..."); }});
add({name:"apk",category:"Download",async run({reply}){ return reply("APK DL..."); }});
add({name:"pinterest",category:"Download",async run({reply}){ return reply("Pinterest..."); }});
add({name:"spotify",category:"Download",async run({reply}){ return reply("Spotify..."); }});
add({name:"mediafire",category:"Download",async run({reply}){ return reply("Mediafire..."); }});
add({name:"gdrive",category:"Download",async run({reply}){ return reply("GDrive..."); }});
add({name:"sticker",category:"Tools",async run({reply}){ return reply("Sticker..."); }});
add({name:"toimg",category:"Tools",async run({reply}){ return reply("ToImg..."); }});
add({name:"kick",category:"Group",async run({reply}){ return reply("Kick..."); }});
add({name:"promote",category:"Group",async run({reply}){ return reply("Promote..."); }});
add({name:"demote",category:"Group",async run({reply}){ return reply("Demote..."); }});