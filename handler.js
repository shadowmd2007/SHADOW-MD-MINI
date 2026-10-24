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
    const mod = await import(pathToFileURL(path.join(__dirname, 'commands.js')).href + `?t=${Date.now()}`);
    const handler = mod.default;
    const msg = upsert.messages?.[0];
    if(!msg || !msg.message) return;
    
    // CACHE for antidelete - yahi main fix hai
    try{
      const { cache } = await import('./lib/store.js');
      if(msg.key?.id) cache.set(msg.key.id, msg);
    }catch{}

    if(typeof handler === 'function'){
      await handler(sock, msg);
    }
  }catch(e){
    console.log('onMessage error:', e.message, e.stack);
  }
}

// YE FUNCTION MISSING THA - Is se deleted message personal pe jayega
export async function onDelete(sock, updates){
  try{
    const { cache } = await import('./lib/store.js');
    const ownerNum = process.env.OWNER_NUMBER || '923263695287';
    const ownerJid = ownerNum + '@s.whatsapp.net';
    
    for(const upd of updates){
      if(upd.update?.message === null){
        const cached = cache.get(upd.key.id);
        if(cached){
          const text = cached.message?.conversation || cached.message?.extendedTextMessage?.text || '[Media/File Deleted]';
          await sock.sendMessage(ownerJid, { 
            text: `🗑️ *DELETED MESSAGE*\n\nFrom: ${upd.key.remoteJid}\nSender: ${upd.key.participant || upd.key.remoteJid}\nContent: ${text}` 
          }).catch(()=>{});
          
          // Agar image/video delete hua to woh bhi bhejo
          try{
            if(cached.message?.imageMessage){
              await sock.sendMessage(ownerJid, { image: cached.message.imageMessage, caption: `🗑️ Deleted Image from ${upd.key.remoteJid}` }).catch(()=>{});
            }
            if(cached.message?.videoMessage){
              await sock.sendMessage(ownerJid, { video: cached.message.videoMessage, caption: `🗑️ Deleted Video from ${upd.key.remoteJid}` }).catch(()=>{});
            }
          }catch{}
        }
      }
    }
  }catch(e){
    console.log('onDelete error:', e.message);
  }
}

export const onGroupUpdate = ()=>{};