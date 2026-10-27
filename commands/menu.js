import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fancy(t){ return t; }

const menu = async (sock, m) => {
  // ✅ COMMANDS FOLDER ME JITNI FILES HAIN SAB UTHAO
  const cmdDir = join(__dirname, '../commands');
  const pluginDir = join(__dirname, '../plugins');
  let all = [];

  for(let dir of [cmdDir, pluginDir]){
    if(fs.existsSync(dir)){
      const files = fs.readdirSync(dir).filter(f=>f.endsWith('.js'));
      for(let file of files){
        try{
          const data = fs.readFileSync(join(dir, file), 'utf8');
          const match = data.match(/\.command\s*=\s*\[([^\]]+)\]/);
          if(match){
            const cmds = match[1].split(',').map(s=>s.replace(/['"` ]/g,'')).filter(Boolean);
            all.push(...cmds);
          }
        }catch{}
      }
    }
  }
  
  all = [...new Set(all)].sort();
  const total = all.length;

  let list = all.map(c=>`│ 🌹 ${c}`).join('\n');

  let txt = `╭─🌹 RANA FURQAN MD 🌹─╮
│ BOT: MERI JAAN
│ TOTAL: ${total} COMMANDS
╰───────────────╯

╭─ ALL COMMANDS ─╮
│
${list}
│
╰───────────────╯

🌹 Type .help for help`;

  await sock.sendMessage(m.key.remoteJid, {
    image: { url: config.botImage },
    caption: txt,
    contextInfo: {
      externalAdReply: {
        title: '🌹 RANA FURQAN MD 🌹',
        body: `📢 Total ${total} Commands - Tap to View Channel`,
        thumbnailUrl: config.botImage,
        sourceUrl: 'https://whatsapp.com/channel/0029VaKjE9p9xVJl0i8N3u2E',
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m });
};

export default menu;
menu.command = ['menu','allmenu','help','commands'];