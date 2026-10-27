import fs from 'fs';
import path from 'path';

export const command = {
  name: "menu",
  aliases: ["help"], // Sirf .menu aur .help
  category: "GENERAL",
  description: "RANA FURQAN MD - Auto Menu with Channel",
  run: async ({ sock, jid, m, prefix }) => {
    
    // --- CONFIG LOAD ---
    let MENU_IMG = process.env.BOT_DP || 'https://files.catbox.moe/y04tbj.jpg';
    let botName = 'RANA FURQAN MD';
    let CHANNEL_LINK = '';
    let CHANNEL_NAME = 'RANA FURQAN MD CHANNEL';

    try {
      if (fs.existsSync('./config.js')) {
        const cfgPath = path.join(process.cwd(), 'config.js');
        const cfg = await import(`file://${cfgPath}?t=${Date.now()}`);
        const c = cfg.default || cfg;
        
        MENU_IMG = c.BOT_IMAGE || c.MENU_IMAGE || c.ALIVE_IMG || c.IMAGE || c.BOT_DP || MENU_IMG;
        botName = c.BOT_NAME || botName;
        CHANNEL_LINK = c.CHANNEL_LINK || c.CHANNEL || c.WHATSAPP_CHANNEL || c.CHANNEL_URL || c.NEWSLETTER || '';
        CHANNEL_NAME = c.CHANNEL_NAME || CHANNEL_NAME;
      }
    } catch (e) {
      console.log('Config Load Error:', e.message);
    }

    // Fallback agar env me ho
    if (!CHANNEL_LINK) {
      CHANNEL_LINK = process.env.CHANNEL_LINK || process.env.CHANNEL || '';
    }

    let version = '5.0.0';
    try {
      if (fs.existsSync('./package.json')) {
        const pkg = JSON.parse(fs.readFileSync('./package.json'));
        version = pkg.version || version;
      }
    } catch {}

    // --- AUTO LOAD ALL COMMANDS (Jo bhi add karoge auto ayega) ---
    let allCmdsText = '';
    let totalCount = 0;
    try {
      const cmdPath = path.join(process.cwd(), 'commands');
      const files = fs.readdirSync(cmdPath).filter(f => f.endsWith('.js'));
      
      const categories = {};
      for (const file of files) {
        const cmdName = file.replace('.js','').toLowerCase();
        if (cmdName === 'menu') continue;
        totalCount++;
        
        // Auto Category detect
        let cat = 'OTHER';
        if (['play','song','video','ytmp3','ytmp4','fb','tiktok','insta','media','song2'].some(x => cmdName.includes(x))) cat = 'DOWNLOADER';
        else if (['gpt','ai','bot','chat','gemini'].some(x => cmdName.includes(x))) cat = 'AI';
        else if (['group','promote','demote','kick','add','tag','hidetag','antilink'].some(x => cmdName.includes(x))) cat = 'GROUP';
        else if (['sticker','stiker','s','toimg','tovideo'].some(x => cmdName.includes(x))) cat = 'CONVERTER';
        else if (['alive','ping','owner','info','runtime','uptime','repo'].some(x => cmdName.includes(x))) cat = 'GENERAL';
        
        if (!categories[cat]) categories[cat] = [];
        categories[cat].push(cmdName);
      }

      for (const [cat, cmds] of Object.entries(categories)) {
        if (cmds.length === 0) continue;
        allCmdsText += `\n┏━━━ ${cat} ━━━┓\n`;
        cmds.sort().forEach(c => {
          allCmdsText += `┃ ◦ ${prefix}${c}\n`;
        });
        allCmdsText += `┗━━━━━━━━━━━━┛\n`;
      }
    } catch (e) {
      allCmdsText = `\n┃ ◦ ${prefix}ping\n┃ ◦ ${prefix}alive\n`;
      totalCount = 108;
    }

    const caption = `┏━━━━━━━━━━━━━━┓
┃ 🌹 ${botName} 🌹 ┃
┗━━━━━━━━━━━━━━┛

┏━━━━ BOT INFO ━━━━┓
┃ VERSION : ${version}
┃ PREFIX : ${prefix}
┃ COMMANDS : ${totalCount}
┃ OWNER : RANA KI JAAN
┗━━━━━━━━━━━━━━┛
${allCmdsText}
┏━━━━ HOW TO USE ━━━━┓
┃ ${prefix}play Pasoori
┃ ${prefix}video Pasoori
┗━━━━━━━━━━━━━━┛

🌹 POWERED BY MERI JAAN 🌹`;

    try {
      // View Channel Button ke saath
      if (CHANNEL_LINK) {
        await sock.sendMessage(jid, {
          image: { url: MENU_IMG },
          caption: caption,
          footer: CHANNEL_NAME,
          buttons: [
            { buttonId: 'channel', buttonText: { displayText: `📢 View Channel` }, type: 1 }
          ],
          headerType: 4,
          // Clickable link ke liye externalAdReply
          contextInfo: {
            externalAdReply: {
              title: CHANNEL_NAME,
              body: "Tap to Join Channel",
              mediaType: 1,
              thumbnailUrl: MENU_IMG,
              sourceUrl: CHANNEL_LINK,
              renderLargerThumbnail: true
            },
            forwardedNewsletterMessageInfo: {
              newsletterJid: CHANNEL_LINK.includes('@newsletter') ? CHANNEL_LINK : undefined,
              serverMessageId: 1
            }
          }
        }, { quoted: m });

        // Saath me direct link bhi bhejo taake 100% clickable ho
        await sock.sendMessage(jid, { text: `📢 *${CHANNEL_NAME}*\n🔗 ${CHANNEL_LINK}\n\n👆 Link pe click karke Channel Join karo!` }, { quoted: m });

      } else {
        // Agar channel link nahi hai to simple menu
        await sock.sendMessage(jid, { image: { url: MENU_IMG }, caption: caption }, { quoted: m });
      }
    } catch (e) {
      console.log('Menu Send Error:', e.message);
      await sock.sendMessage(jid, { text: caption + (CHANNEL_LINK ? `\n\n📢 CHANNEL: ${CHANNEL_LINK}` : '') }, { quoted: m });
    }
  }
};