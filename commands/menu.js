import { config } from '../config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const name = "menu";
export async function execute(sock, msg, args, extra){
  const jid = msg.key.remoteJid;
  const DP = config.menuImage;
  const dir = __dirname;
  let files = [];
  try{ files = fs.readdirSync(dir).filter(f=>f.endsWith('.js')).map(f=>f.replace('.js','')); }catch{ files = [...(extra?.commands?.keys()||[])]; }

  const cats = {
    "🔥 DOWNLOADER": files.filter(f=>['play','song','video','yt','fb','tiktok','insta','apk','mediafire'].some(k=>f.includes(k))),
    "👑 BOT": ["owner","alive","ping","botinfo","menu","help","restart","setprefix"],
    "👥 GROUP": files.filter(f=>['tag','group','add','kick','promote','admin','announce'].some(k=>f.includes(k))),
    "🛡️ SECURITY": ["antidelete","vv","vv2","vv3","autostatus"],
    "😂 FUN": files.filter(f=>['love','ship','hug','kiss','slap','8ball','truth','dare','joke'].some(k=>f.includes(k))),
    "🔧 TOOLS": files.filter(f=>!['play','video','owner','menu','vv','antidelete','tag','group','love'].some(k=>f.includes(k))).slice(0,30)
  };
  
  // agar filter khali ho to saare dikhao
  let allFound = Object.values(cats).flat();
  let remaining = files.filter(f=>!allFound.includes(f));
  if(remaining.length) cats["📦 OTHERS"] = remaining;

  let txt = `*╭━━━〘 ${config.botName} 〙━━━╮*\n*┃* Total: ${files.length} Cmds\n*┃* Prefix: ${config.prefix}\n*┃* 🌹 Meri JAAN\n*╰━━━━━━━━━━━━━━╯*\n\n`;
  for(const [cat, list] of Object.entries(cats)){
    if(!list.length) continue;
    txt += `*╭─ ${cat} ─*\n`;
    txt += `*│* ${list.sort().map(c=>`.${c}`).join('\n*│* ')}\n`;
    txt += `*╰───────────────*\n\n`;
  }
  txt += `_Use .play / .video name_\n_Meri JAAN 🌹_`;
  
  await sock.sendMessage(jid,{image:{url:DP},caption:txt},{quoted:msg}).catch(async()=>{ await sock.sendMessage(jid,{text:txt},{quoted:msg}); });
}
export default { name, execute };