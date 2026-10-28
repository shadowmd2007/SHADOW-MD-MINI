export default {
  name: "menu",
  aliases: ["allmenu","help","list"],
  async execute(sock, m, args, { prefix, config }){
    const jid = m.key.remoteJid;
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.join(process.cwd(),'commands');
    let files = [];
    try{ files = fs.readdirSync(dir).filter(f=>f.endsWith('.js')).map(f=>f.replace('.js','')); }catch{}

    // CATEGORY DEFINITION
    const categories = {
      "🤖 AI MENU": ["ai","gpt","gpt4","gemini","meta","blackbox","bard","imagine","dalle","llama"],
      "👑 OWNER MENU": ["owner","sudo","ban","unban","block","unblock","jid","broadcast","bc","bcall","restart","update","mode","public","private","self","bot","setpp","setbio"],
      "👥 GROUP MENU": ["group","ginfo","groupinfo","gc","kick","add","promote","demote","tagall","hidetag","invite","link","revoke","mute","unmute","lock","unlock","approve","reject","members","admins","groupid"],
      "📥 DOWNLOADER MENU": ["play","song","video","yt","yta","ytv","yts","fb","tiktok","tt","insta","ig","mediafire","gdrive","apk","apkdl","play2"],
      "🎉 FUN MENU": ["joke","fact","quote","meme","truth","dare","ship","love","hug","kiss","how","8ball","dice","flip","coin","compliment","insult","roast","emojimix"],
      "🔧 TOOL MENU": ["sticker","s","toimg","toaudio","tovideo","url","translate","trt","calc","base64","binary","unbinary","upper","lower","reverse","repeat","choose","count"],
      "🔍 SEARCH MENU": ["google","wiki","lyrics","wallpaper","pinterest","image","ytsearch","weather","gimage"],
      "⚙️ SETTINGS MENU": ["antidelete","autostatus","autoview","autolike","autobio","welcome","goodbye","antilink","antispam","autovideo","autoreact","keepalive"],
      "💎 MAIN MENU": ["alive","ping","speed","runtime","uptime","status","botinfo","botinfo2","id","ping2"]
    };

    // Full form - Bade lafzon mein
    const toFull = (c) => c.toUpperCase();

    let caption = `┏━━〔 *RANA FURQAN MD* 〕━━┓\n`;
    caption += `┃\n`;
    caption += `┃ 🤖 BOT: RANA FURQAN MD\n`;
    caption += `┃ 👑 OWNER: Rana Furqan Rajput\n`;
    caption += `┃ 📞 NUMBER: 923003719761\n`;
    caption += `┃ ⚙️ MODE: PUBLIC\n`;
    caption += `┃ 🔥 PREFIX: ${prefix}\n`;
    caption += `┃ 📊 TOTAL: ${files.length} COMMANDS\n`;
    caption += `┃\n`;
    caption += `┗━━━━━━━━━━━━━━┛\n\n`;

    for(let catName in categories){
      let catCmds = categories[catName].filter(c=>files.includes(c));
      if(catCmds.length===0) continue;
      caption += `┏━━〔 ${catName} 〕━━\n`;
      catCmds.forEach(c=>{
        caption += `┃ ✦ ${prefix}${toFull(c)}\n`;
      });
      caption += `┗━━━━━━━━━━━\n\n`;
    }

    // Bachi hui commands jo kisi category mein nahi
    let used = Object.values(categories).flat();
    let remaining = files.filter(f=>!used.includes(f));
    if(remaining.length>0){
      caption += `┏━━〔 🌹 EXTRA MENU 〕━━\n`;
      remaining.forEach(c=>{ caption += `┃ ✦ ${prefix}${toFull(c)}\n`; });
      caption += `┗━━━━━━━━━━━\n\n`;
    }

    caption += `━━━━━━━━━━━━━━━\n`;
    caption += `🌹 *POWERED BY MERI JAAN* 🌹\n`;
    caption += `━━━━━━━━━━━━━━━`;

    // NO RAW LINKS - ONLY VIEW CHANNEL BUTTON
    await sock.sendMessage(jid, {
      image: { url: config.menuImage || "https://i.ibb.co/BHfCmfbw/jawadmd.jpg" },
      caption: caption,
      contextInfo: {
        isForwarded: true,
        forwardingScore: 999,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363318009513250@newsletter",
          newsletterName: "RANA FURQAN MD",
          serverMessageId: 1
        }
      }
    }, { quoted: m });
  }
}