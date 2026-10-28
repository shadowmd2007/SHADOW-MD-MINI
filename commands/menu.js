export default {
  name: "menu",
  aliases: ["allmenu","help"],
  async execute(sock, m, args, { prefix, config }){
    const jid = m.key.remoteJid;
    const fs = await import('fs');
    const path = await import('path');
    const dir = path.join(process.cwd(),'commands');
    let files = [];
    try{ 
      files = fs.readdirSync(dir).filter(f=>f.endsWith('.js')).map(f=>f.replace('.js','')).sort();
    }catch{}

    const categories = {
      "🤖 AI MENU": ["ai","gpt","gpt4","gemini","meta","blackbox","bard","imagine","dalle","llama","bing","copilot","deepseek","chatgpt","openai","aivoice","aiimg","flux","sora"],
      "👑 OWNER MENU": ["owner","sudo","sudos","ban","unban","block","unblock","jid","broadcast","bc","bcall","restart","update","mode","public","private","self","bot","setpp","setbio","setname","setdesc","clearsession","pair","save","getsession","del","delete","eval","exec"],
      "👥 GROUP MENU": ["group","ginfo","groupinfo","gc","kick","add","promote","demote","tagall","hidetag","tag","invite","link","revoke","gclink","mute","unmute","lock","unlock","approve","reject","members","admins","groupid","gname","gdesc","leave","gpp","out","antilinkgc","welcome","goodbye","setwelcome","setgoodbye"],
      "💎 MAIN MENU": ["alive","ping","speed","pong","ping2","runtime","uptime","status","botinfo","botinfo2","id","jid2","repo","sc","script","power","rules","time","date","info","about","help2","menu2","list","allmenu","ownerinfo"],
      "📥 DOWNLOADER MENU": ["play","song","video","yt","yta","ytv","yts","ytsearch","play2","song2","video2","fb","facebook","tiktok","tt","tt2","tiktok2","insta","ig","ig2","mediafire","mfire","gdrive","drive","apk","apkdl","playstore","spotify","sp","soundcloud","twitter","x","threads","capcut","likee"],
      "🎉 FUN MENU": ["joke","jokes","fact","facts","quote","quotes","meme","memes","truth","dare","ship","shipp","love","loves","hug","kiss","how","8ball","dice","flip","coin","compliment","insult","roast","slap","pat","cuddle","cry","affect","beautiful","wanted","jail","love2","gay","lesbian","handsome","beauty"],
      "🔧 TOOL MENU": ["sticker","s","stiker","toimg","toimage","toaudio","tovideo","tourl","url","translate","trt","calc","calculate","base64","binary","unbinary","upper","lower","reverse","repeat","choose","count","emojimix","mix","qc","quotechat","brat","ttp","attp","fancy","style","ss","screenshot","short","shorturl","tinyurl","getpp","getbio","carbon","obfuscate"],
      "🔍 SEARCH MENU": ["google","ggl","wiki","wikipedia","lyrics","lyric","wallpaper","wp","pinterest","pin","image","images","gimage","ytsearch","yts2","weather","wthr","news","github","igstalk","tiktokstalk","npm","define","urban"],
      "⚙️ SETTINGS MENU": ["antidelete","antidel","autostatus","autostatusview","autoview","autolike","autobio","autoreact","autotyping","autoread","autorecording","welcome","goodbye","antilink","antispam","antibad","antibot","antiviewonce","antidelete2","keepalive","autoblock","onlyadmin","onlygroup","anticall","antigroup","setprefix","setmenu"]
    };

    let caption = `┏━━〔 *RANA FURQAN MD* 〕━━┓\n`;
    caption += `┃ 🤖 BOT: RANA FURQAN MD\n`;
    caption += `┃ 👑 OWNER: Rana Furqan\n`;
    caption += `┃ 📊 TOTAL: ${files.length} COMMANDS\n`;
    caption += `┗━━━━━━━━━━━━━━┛\n\n`;

    let allUsed = [];
    for(let catName in categories){
      let catCmds = categories[catName].filter(c=>files.includes(c));
      allUsed = [...allUsed, ...catCmds];
      if(catCmds.length===0) continue;
      caption += `┏━━〔 ${catName} 〕━━\n`;
      catCmds.forEach(cmd=>{
        caption += `┃ ✦ ${prefix}${cmd.toUpperCase()}\n`;
      });
      caption += `┗━━━━━━━━━━━━━━━\n\n`;
    }

    let remaining = files.filter(f=>!allUsed.includes(f) && f !== 'menu');
    if(remaining.length>0){
      caption += `┏━━〔 🌹 OTHER MENU 〕━━\n`;
      remaining.forEach(cmd=>{
        caption += `┃ ✦ ${prefix}${cmd.toUpperCase()}\n`;
      });
      caption += `┗━━━━━━━━━━━━━━━\n\n`;
    }

    caption += `━━━━━━━━━━━━━━━\n`;
    caption += `🌹 POWERED BY MERI JAAN 🌹\n`;
    caption += `━━━━━━━━━━━━━━━`;

    await sock.sendMessage(jid, {
      image: { url: config.menuImage || config.botImage },
      caption: caption,
      contextInfo: {
        forwardingScore: 999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363319314627663@newsletter",
          newsletterName: "RANA FURQAN MD",
          serverMessageId: 1
        },
        externalAdReply: {
          title: "🌹 RANA FURQAN MD 🌹",
          body: "Tap to View Channel",
          thumbnailUrl: config.botImage,
          sourceUrl: "https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J",
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });
  }
}