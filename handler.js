import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const commands = new Map();
export let commandList = [];

export async function loadCommands(){
  commands.clear();
  commandList = [];
  const singleFile = path.join(__dirname, 'commands.js');
  
  if(fs.existsSync(singleFile)){
    try{
      const mod = await import(pathToFileURL(singleFile).href + `?t=${Date.now()}`);
      let list = mod.default || mod.commands || mod;
      if(!Array.isArray(list) && typeof list === 'object'){
        list = Object.values(list);
      }
      if(Array.isArray(list)){
        for(const c of list){
          if(c && c.name){
            const name = c.name.toLowerCase();
            commands.set(name, c);
            if(c.alias) for(const a of c.alias) commands.set(a.toLowerCase(), c);
            commandList.push(c);
          }
        }
      }
      console.log(`[Command Load] ${commandList.length} from commands.js`);
      return commandList.length;
    }catch(e){
      console.log('commands.js error:', e.message);
    }
  }
  return 0;
}

export async function onMessage(sock, {messages}){
  const msg = messages?.[0];
  if(!msg || !msg.message) return;
  if(msg.key.fromMe) return;
  
  const from = msg.key.remoteJid;
  const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
  if(!body) return;
  
  const prefix = '.';
  if(!body.startsWith(prefix)) return;

  const args = body.slice(prefix.length).trim().split(/ +/);
  const cmdName = args.shift().toLowerCase();
  const cmd = commands.get(cmdName);
  if(!cmd) return;

  console.log(`[CMD] ${cmdName} from ${from}`);
  try{
    const reply = (text) => sock.sendMessage(from, {text}, {quoted: msg});
    await cmd.execute(sock, msg, args, {from, reply, prefix, commands: commandList});
  }catch(e){
    console.log(`[CMD ERROR] ${cmdName}:`, e.message);
  }
}
export const onGroupUpdate = ()=>{};