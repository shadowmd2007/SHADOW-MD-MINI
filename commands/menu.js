import fs from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import config from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fancy(text){
  const map = { 'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','a':'𝗔','b':'𝗕','c':'𝗖','d':'𝗗','e':'𝗘','f':'𝗙','g':'𝗚','h':'𝗛','i':'𝗜','j':'𝗝','k':'𝗞','l':'𝗟','m':'𝗠','n':'𝗡','o':'𝗢','p':'𝗣','q':'𝗤','r':'𝗥','s':'𝗦','t':'𝗧','u':'𝗨','v':'𝗩','w':'𝗪','x':'𝗫','y':'𝗬','z':'𝗭','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵' };
  return text.split('').map(c => map[c] || c).join('');
}

function clockString(s){
  s=Number(s);
  const d=Math.floor(s/(3600*24));
  const h=Math.floor((s%(3600*24))/3600);
  const m=Math.floor((s%3600)/60);
  const sec=Math.floor(s%60);
  return `${d}D ${h}H ${m}M ${sec}S`;
}

const menu = async (sock, m) => {
  // ✅ AUTO SCAN - commands + plugins dono
  let searchFolders = ['commands', 'plugins', 'Commands', 'PLUGINS'];
  let allCmds = [];
  let filesFound = 0;

  for(let folderName of searchFolders){
    const dir = join(__dirname, '..', folderName);
    if(fs.existsSync(dir)){
      const files = fs.readdirSync(dir).filter(f=>f.endsWith('.js') && f !== 'menu.js');
      filesFound += files.length;
      for(let file of files){
        try{
          const content = fs.readFileSync(join(dir, file), 'utf8');
          // command = [...] ya command: [...] dono dhoondo
          const match = content.match(/\.command\s*=\s*\[([^\]]+)\]/) || content.match(/command\s*:\s*\[([^\]]+)\]/);
          if(match?.[1]){
            const cmds = match[1].split(',').map(s=>s.replace(/['"`\s]/g,'').trim()).filter(Boolean);
            allCmds.push(...cmds);
          }
        }catch{}
      }
    }
  }
  
  // Duplicate hatao aur sort karo
  allCmds = [...new Set(allCmds)].sort();
  
  const uptime = clockString(process.uptime());
  const total = allCmds.length || 1;

  // ✅ COMMAND LIST BANAO
  let cmdList = allCmds.map(c => `│ 🌹 ${fancy(c)}`).join('\n');
  if(!cmdList) cmdList = `│ 🌹 ${fancy('ping')}\n│ 🌹 ${fancy('alive')}`;

  let txt = `╭─🌹─ ${fancy('RANA FURQAN MD')} ─🌹─╮
│
│ 🌹 ${fancy('BOT')} : ${fancy('MERI JAAN')}
│ 🌹 ${fancy('PREFIX')} : ${fancy(config.prefix)}
│ 🌹 ${fancy('UPTIME')} : ${fancy(uptime)}
│ 🌹 ${fancy('TOTAL FILES')} : ${fancy(filesFound.toString())}
│ 🌹 ${fancy('COMMANDS')} : ${fancy(total.toString())}
│
╰─🌹─────────────🌹─╯

╭─🌹─ ${fancy('ALL COMMANDS')} ─🌹─╮
│
${cmdList}
│
╰─🌹─────────────🌹─╯

🌹 ${fancy('BOT BY RANA FURQAN')} 🌹`;

  await sock.sendMessage(m.key.remoteJid, {
    image: { url: config.botImage },
    caption: txt,
    contextInfo: {
      forwardingScore: 999,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: '120363319314627663@newsletter',
        newsletterName: 'RANA FURQAN MD',
        serverMessageId: 1
      },
      externalAdReply: {
        title: '🌹 RANA FURQAN MD - MERI JAAN 🌹',
        body: '📢 Tap To View Channel',
        thumbnailUrl: config.botImage,
        sourceUrl: 'https://whatsapp.com/channel/0029VaKjE9p9xVJl0i8N3u2E',
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  }, { quoted: m });
};

export default menu;
menu.command = ['menu','allmenu','help','commands','list'];