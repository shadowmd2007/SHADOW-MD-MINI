import { config } from "../config.js";

const list = [
  ["ai", "AI"],
  ["anime", "ANIME"],
  ["audioeffects", "AUDIO"],
  ["smd bug", "BUG"],
  ["attp currency gif sticker2img tomp3 toptt ttp tts tts2 uploadfile", "CONVERT"],
  ["apk audiodoc drama fb gdroid gdrive gitclone insta instamp3 mediafire movie pinterest play playaudio playvideo song songdoc spotify tiktok twitter video videodoc wallpaper zipdl", "DOWNLOAD"],
  ["8ball adopt advice alert angry bite blush bonk bored carry character clap coinflip compliment confused court crush cry cuddle cute dance dare dice divorce expose facepalm feed flirt friendship hack handsome happy heart highfive hug iq joke kick kiss laugh lie lovemeter lovetest marry meme moon nod nope pat peek poison poke pout propose punch quote rate repeat report reverse riddle roast rob rps sad salute shake shayari ship shocked shoot shrug shy simp sip slap sleep smile spin stare sus tableflip think thumbs-up tickle truth wave wink yawn yeet", "FUN"],
  ["connect4 games joinc4 math numguess rps stopgame ttt wordguess", "GAMES"],
  ["accept add del demote gdesc ginfo glink gname hidetag kickall kickme listadmins lock mute out poll promote reject remove requestlist resetlink resetwarn rules setppgroup setrules settings tag tagadmins tagall totag unlock unmute vcf warn warnings whois", "GROUP"],
  ["camera getcapture", "HACK"],
  ["aftereatingdua afterwudhu asmaulhusna ayatulqursi azaan beforewudhu drinkingdua duaekunoot duafoabundant duafoanxiety duafoforbusiness duafochildren duafoexams duafoforgiveness duafohealth duafohelp duafointerview duafojannah duafojannatulfirdous duaformarriage duaformoney duaformorning duafoparents duaforpeace duafornewstart duaforizq duaslist duroodshareef eatingdua enteringhouse enteringmsjid eveningdua goingtomsjid hijri islamicmonths kalma1 kalma2 kalma3 kalma4 kalma5 kalma6 leavinghouse leavingmsjid morningadhkar morningdua prayer prayertime qibla ramadan randomdua searchdua sleepingdua surah suraharabic traveldua wakingdua", "ISLAMIC"],
  ["3dsilver angelwing bagan balloon circle colorful cubic foggy galaxy gaming golden gradient hacker jewel mascot matrix metal papercut sand snake splat star typography wgalaxy", "LOGO"],
  ["alive alive2 gp ass owner ping repo test tools", "MAIN"],
  ["abs avg divide max min minus mod multiply pct plus power round sqrt square", "MATH"],
  ["allmenu followall unfollowall", "MISC"],
  ["autobio ban block blocklist delsudo getgpp getpp jid join kickadmins left listban listsudo newgc newsletter sim smd status sudo unban unblock vv", "OWNER"],
  ["abdullahzareem ahmedfaraz amjad attitude bday cat china dog faiz f bday happyshayari image image2 indo iqbal japan jaune lia javedakhtar jokerimg korea lovevideo morning naqvi night pakistani parveenshakir qateel romantic sadshayari tehzeebhafi thailand vietnam wasif", "RANDOM"],
  ["country crypto define facebook3 github gitstalk google lyrics moviesearch pins2 spotifysearch srepo tiks urban weather wiki yts", "SEARCH"],
  ["adminevents alwaysonline antibad antibadaction anticall antidel antidelpath antidemote antiedit antieditpath antiforeign antiforeignnumber antilink antilinkaction antimedia antimediaaction antimediablock antipromote antistatus antistatusmention autodl autoreact autoread autorecord autoreply autosticker autotype botname caption chatbot customemoji customreact goodbye groupsettings heartreact mentionreply mode ownername prefix rejectmsg settings setgoodbye setwelcome statusemojis statusmsg statusreact statusreply statusview welcome", "SETTINGS"],
  ["emix sticker telestick", "STICKER"],
  ["up", "SYSTEM"],
  ["addnote anime base64 binary blurface calc cartoon checkmail colorize cyberpunk define delnote device emojimix enhance enhance1 enhance4 enhance8 fancy fastping fetch fliptext font forex forward fullpp fullss getnote github grayscale gunzip gzip invert ipinfo itunes morse notes npm password pixelart poll proxy qr qrtotext readqr remind remin i removebg removebg2 reverse screenshot shorten sketch tempmail texttoqr time tinyurl translate unbase64 unbinary unblur unmorse unshorten upscale url vcard vintage whatmusic", "TOOLS"],
  ["age countdown date time timezone week year", "UTILITY"]
];

const categories = new Map();
for (const [raw, cat] of list) {
  const cmds = raw.split(/\s+/).map(x=>x.replace(/[^a-z0-9-]/gi,"")).filter(Boolean);
  categories.set(cat, [...new Set(cmds)]);
}

const commands = new Map();
const add = (name, meta) => commands.set(name, meta);

const reply = async ({sock,remote,msg,text}) => sock.sendMessage(remote,{text},{quoted:msg});

add("ping", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:"🏓 *SHADOW MD* Pong! 🟢"})});
add("alive", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`🟢 *${config.botName} ONLINE*\\n👑 Owner: ${config.ownerName}\\n⚙️ Prefix: ${config.prefix}\\n📦 Version: ${config.version}\\n🛡️ Mode: ${config.mode}`})});
add("owner", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`👑 *OWNER*\\n${config.ownerName}\\n📱 wa.me/${config.ownerNumber}`})});
add("repo", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`💻 *SHADOW MD REPOSITORY*\\n${config.githubRepository}`})});
add("channel", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`📢 ${config.channelName}\\n${config.channelLink}`})});
add("group", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`👥 ${config.groupName}\\n${config.groupLink}`})});

function menuText() {
  const order = ["MAIN","AI","ANIME","AUDIO","CONVERT","DOWNLOAD","FUN","GAMES","GROUP","HACK","ISLAMIC","LOGO","MATH","MISC","OWNER","RANDOM","SEARCH","SETTINGS","STICKER","SYSTEM","TOOLS","UTILITY"];
  let out = `*┌───⭓ ${config.botName} ⭓───*\\n*│* 👑 *OWNER:* ${config.ownerName}\\n*│* 📱 *BAILEYS:* MULTI DEVICE\\n*│* ⚙️ *TYPE:* NODEJS\\n*│* 🔑 *PREFIX:* ${config.prefix}\\n*│* 🛡️ *MODE:* ${config.mode}\\n*│* 📦 *VERSION:* ${config.version}\\n*└───────────────────⭓*\\n\\n`;
  for (const cat of order) {
    const arr = categories.get(cat) || [];
    if (!arr.length) continue;
    out += `*┌───⭓ ${cat.toLowerCase()} ⭓───*\\n`;
    for (const c of arr) out += `*│* ⬡ .${c}\\n`;
    out += `*└───────────────────⭓*\\n\\n`;
  }
  return out.trim();
}
add("menu", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:menuText()})});
add("allmenu", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:menuText()})});
add("mainmenu", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:menuText()})});
add("help", { run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`*SHADOW MD HELP*\\n\\nPrefix: ${config.prefix}\\n.menu — show all command categories\\n.ping — bot response test\\n.alive — bot status\\n.owner — owner details\\n.repo — GitHub repository\\n.channel — WhatsApp channel\\n.group — WhatsApp group\\n\\nUse commands only where their category/permission allows.`})});

add("jid", {owner:true, run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`📌 JID: ${remote}`})});
add("url", {owner:true, run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`📌 Current chat JID:\\n${remote}`})});
add("status", {owner:true, run: async ({sock,remote,msg}) => reply({sock,remote,msg,text:`🟢 *STATUS*\\nBot: ${config.botName}\\nMode: ${config.mode}\\nVersion: ${config.version}\\nUptime: ${Math.floor(process.uptime())}s`})});

const basic = {
  "base64": t=>Buffer.from(t,"utf8").toString("base64"),
  "unbase64": t=>Buffer.from(t,"base64").toString("utf8"),
  "binary": t=>t.split("").map(c=>c.charCodeAt(0).toString(2).padStart(8,"0")).join(" "),
  "unbinary": t=>t.split(/\s+/).map(b=>String.fromCharCode(parseInt(b,2))).join(""),
  "upper": t=>t.toUpperCase(),
  "lower": t=>t.toLowerCase()
};
for (const [name, fn] of Object.entries(basic)) {
  add(name,{run:async({sock,remote,msg,args})=>reply({sock,remote,msg,text:fn(args.join(" "))||"❌ Provide text."})});
}

for (const [cat, arr] of categories) {
  for (const name of arr) {
    if (commands.has(name)) continue;
    const owner = cat === "OWNER";
    const group = cat === "GROUP" || cat === "SETTINGS";
    add(name, {
      owner,
      group,
      run: async ({sock,remote,msg,args}) => {
        const note = args.length ? `\\nInput: ${args.join(" ")}` : "";
        await reply({sock,remote,msg,text:`⚙️ *${config.botName}*\\n.${name} is registered under *${cat}*.\\nThis command requires its specific external service/media implementation.${note}`});
      }
    });
  }
}

export { commands, categories };
            
