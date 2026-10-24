import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const commands = new Map();
export let commandList = [];

export async function loadCommands(){
  try{
    const filePath = path.join(__dirname, 'commands.js');
    const text = fs.readFileSync(filePath, 'utf8');
    const count = (text.match(/\badd\s*\(/g) || []).length;
    console.log(`[Command Load] ${count} from commands.js`);
    return count;
  }catch(e){
    console.log('Load error:', e.message);
    return 0;
  }
}

export async function onMessage(sock, upsert){
  try{
    // commands.js khud pura bot hai, usko hi chalao
    const mod = await import(pathToFileURL(path.join(__dirname, 'commands.js')).href + `?t=${Date.now()}`);
    const handler = mod.default; // ye handleMessage hai
    if(typeof handler === 'function'){
      const msg = upsert.messages?.[0];
      if(!msg || !msg.message) return;
      await handler(sock, msg);
    }
  }catch(e){
    console.log('onMessage error:', e.message, e.stack);
  }
}
export const onGroupUpdate = ()=>{};