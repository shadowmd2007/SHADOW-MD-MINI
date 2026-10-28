import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const menu = async (sock, m) => {
  try {
    const cmdDir = join(__dirname, '../commands');
    let allCommands = [];

    if (fs.existsSync(cmdDir)) {
      const files = fs.readdirSync(cmdDir).filter(f => f.endsWith('.js'));
      
      for (let file of files) {
        try {
          const filePath = join(cmdDir, file);
          const data = fs.readFileSync(filePath, 'utf8');
          
          // 3 tarah se command name nikalo
          let cmds = [];
          
          // Style 1: .command = ['menu','help']
          let m1 = data.match(/\.command\s*=\s*\[([^\]]+)\]/);
          if (m1) {
            cmds = m1[1].split(',').map(s => s.replace(/['"`\s]/g, '')).filter(Boolean);
          }
          // Style 2: name: "ping"
          let m2 = data.match(/name\s*:\s*["']([^"']+)["']/);
          if (m2) {
            cmds.push(m2[1]);
          }
          // Style 3: alias: ["allmenu","help"]
          let m3 = data.match(/alias\s*:\s*\[([^\]]+)\]/);
          if (m3) {
            let alias = m3[1].split(',').map(s => s.replace(/['"`\s]/g, '')).filter(Boolean);
            cmds.push(...alias);
          }
          
          // Agar kuch nahi mila to file name ko hi command samjho
          if (cmds.length === 0) {
            cmds.push(file.replace('.js', ''));
          }
          
          allCommands.push(...cmds);
        } catch {}
      }
    }

    // Duplicate hatao, sort karo
    allCommands = [...new Set(allCommands)].sort();
    const total = allCommands.length;

    // List banao
    let list = allCommands.map(c => `│ ⚡ ${config.prefix}${c}`).join('\n');

    let txt = `╭━━━〔 *${config.botName}* 〕━━━╮
┃
┃ 🖼️ *BOT DP:* ${config.botImage}
┃
┣━━━ *BOT INFO* ━━━
┃ 🤖 *Bot:* ${config.botName}
┃ 👑 *Owner:* ${config.ownerName}
┃ 📞 *Number:* ${config.ownerNumber}
┃
┣━━━ *STATUS* ━━━
┃ ⚙️ *Mode:* ${config.mode}
┃ 🔥 *Prefix:* ${config.prefix}
┃ ⏱️ *Uptime:* ${Math.floor(process.uptime()/3600)}H ${Math.floor((process.uptime()%3600)/60)}M
┃ 📊 *Total:* ${total} Commands
┃
┣━━━ *ALL ${total} COMMANDS* ━━━
┃
${list}
┃
╰━━━━━━━━━━━━━━━━━━╯

📢 *Channel:* ${config.channelLink}
👥 *Group:* ${config.groupLink}

> _Type ${config.prefix}help <command> for details_
> _${config.botName} - Made with ❤️_`;

    await sock.sendMessage(m.key.remoteJid, {
      image: { url: config.menuImage || config.botImage },
      caption: txt,
      contextInfo: {
        externalAdReply: {
          title: `${config.botName} - ${total} Commands`,
          body: `Mode: ${config.mode} | Prefix: ${config.prefix} | Owner: ${config.ownerName}`,
          thumbnailUrl: config.botImage,
          sourceUrl: config.channelLink,
          mediaType: 1,
          renderLargerThumbnail: true
        }
      }
    }, { quoted: m });

  } catch (e) {
    console.log("Menu Error:", e);
    await sock.sendMessage(m.key.remoteJid, { text: `❌ Menu Error: ${e.message}` }, { quoted: m });
  }
};

export default menu;
menu.command = ['menu', 'allmenu', 'help', 'commands'];