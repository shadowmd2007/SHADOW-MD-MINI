import fs from 'fs';
import { join, dirname } from 'url';
import { fileURLToPath } from 'url';
import config from '../config.js';
import store from '../lib/store.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function fancy(text){
  const map = { 'A':'𝗔','B':'𝗕','C':'𝗖','D':'𝗗','E':'𝗘','F':'𝗙','G':'𝗚','H':'𝗛','I':'𝗜','J':'𝗝','K':'𝗞','L':'𝗟','M':'𝗠','N':'𝗡','O':'𝗢','P':'𝗣','Q':'𝗤','R':'𝗥','S':'𝗦','T':'𝗧','U':'𝗨','V':'𝗩','W':'𝗪','X':'𝗫','Y':'𝗬','Z':'𝗭','a':'𝗔','b':'𝗕','c':'𝗖','d':'𝗗','e':'𝗘','f':'𝗙','g':'𝗚','h':'𝗛','i':'𝗜','j':'𝗝','k':'𝗞','l':'𝗟','m':'𝗠','n':'𝗡','o':'𝗢','p':'𝗣','q':'𝗤','r':'𝗥','s':'𝗦','t':'𝗧','u':'𝗨','v':'𝗩','w':'𝗪','x':'𝗫','y':'𝗬','z':'𝗭','0':'𝟬','1':'𝟭','2':'𝟮','3':'𝟯','4':'𝟰','5':'𝟱','6':'𝟲','7':'𝟳','8':'𝟴','9':'𝟵' };
  return text.split('').map(c => map[c] || c).join('');
}

function clockString(seconds){
  seconds = Number(seconds);
  const d = Math.floor(seconds / (3600*24));
  const h = Math.floor((seconds % (3600*24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}D ${h}H ${m}M ${s}S`;
}

const menu = async (sock, m) => {
  const pluginsPath = join(__dirname, '../');
  // Auto scan plugins folder
  const pluginsDir = join(__dirname, '../plugins');
  let allCmds = [];
  try{
    const files = fs.readdirSync(pluginsDir).filter(f=>f.endsWith('.js'));
    for(let file of files){
      try{
        const content = fs.readFileSync(join(pluginsDir, file), 'utf8');
        const match = content.match(/command\s*=\s*\[([^\]]+)\]/);
        const match2 = content.match(/command\s*:\s*\[([^\]]+)\]/);
        const mtxt = match?.[1] || match2?.[1] || '';
        if(mtxt){
          const cmds = mtxt.split(',').map(s=>s.replace(/['"`\s]/g,'').trim()).filter(Boolean);
          allCmds.push(...cmds);
        }
      }catch{}
    }
  }catch{}
  allCmds = [...new Set(allCmds)].sort();
  
  const uptime = clockString(process.uptime());
  const mode = store.get('public') ? 'PUBLIC' : 'PRIVATE';
  const total = allCmds.length || 108;

  let cmdList = allCmds.map(c => `│ 🌹 ${fancy(c)}`).join('\n');
  if(!cmdList) cmdList = `│ 🌹 ${fancy('ping')}\n│ 🌹 ${fancy('alive')}\n│ 🌹 ${fancy('owner')}\n│ 🌹 ${fancy('song')}\n│ 🌹 ${fancy('video')}`;

  let txt = `
╭─🌹─ ${fancy('RANA FURQAN MD')} ─🌹─╮
│
│ 🌹 ${fancy('OWNER')} : ${fancy('RANA FURQAN MD')}
│ 🌹 ${fancy('BOT NAME')} : ${fancy('MERI JAAN')}
│ 🌹 ${fancy('PREFIX')} : ${fancy(config.prefix)}
│ 🌹 ${fancy('UPTIME')} : ${fancy(uptime)}
│ 🌹 ${fancy('MODE')} : ${fancy(mode)}
│ 🌹 ${fancy('COMMANDS')} : ${fancy(total.toString())}
│
╰─🌹─────────────🌹─╯

╭─🌹─ ${fancy('ALL COMMANDS')} ─🌹─╮
│
${cmdList}
│
╰─🌹─────────────🌹─╯

🌹 ${fancy('BOT BY RANA FURQAN MD')} 🌹
🌹 ${fancy('MERI JAAN')} 🌹
`;

  await sock.sendMessage(m.key.remoteJid, {
    image: { url: config.botImage },
    caption: txt
  }, { quoted: m });
};

export default menu;
menu.command = ['menu', 'allmenu', 'help', 'commands', 'list'];
menu.desc = 'RANA FURQAN MD MENU';