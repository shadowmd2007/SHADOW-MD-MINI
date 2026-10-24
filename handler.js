import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cache = new Map();

export let settings;

export async function loadCommands(){
  try{
    const filePath = path.join(__dirname, 'commands.js');
    const text = fs.readFileSync(filePath, 'utf8');
    const count = (text.match(/\badd\s*\(/g) || []).length;
    console.log(`Command Load: ${count}`);
    const mod = await import(`./commands.js?v=${Date.now()}`);
    settings = mod.settings;
    console.log(`✅ ${mod.totalCommands()} COMMANDS LOADED`);
    return count;
  }catch(e){
    console.log('Load Error:', e.message);
    return 0;
  }
}

export async function onMessage(sock, upsert){
  const m = upsert.messages?.[0];
  if(!m || !m.message) return;
  // fromMe ko yahan block mat karo - same number pe kaam nahi karega
  try{
    const mod = await import(`./commands.js?v=${Date.now()}`);
    if(mod.handleMessage){
      await mod.handleMessage(sock, m);
    } else if(mod.default){
      // agar purana default ho to usko bhi support
      await mod.default(sock, m);
    }
  }catch(e){
    console.log('onMessage error:', e.message);
  }
}

export async function onDelete(sock, updates){
  try{
    if(!settings?.antidelete) return;
    for(const upd of updates){
      const key = upd.key;
      const cached = cache.get(`${key.remoteJid}_${key.id}`);
      if(!cached) continue;
      const ownerJid = (process.env.OWNER_NUMBER || settings.ownerNumber).split(',')[0].trim() + '@s.whatsapp.net';
      if(cached.message?.imageMessage){
        await sock.sendMessage(ownerJid, {image: cached.message.imageMessage, caption: `*DELETED IMAGE*\nFrom: ${upd.key.remoteJid}\nBy: ${cached.participant||'Unknown'}`}).catch(()=>{});
      } else if(cached.message?.videoMessage){
        await sock.sendMessage(ownerJid, {video: cached.message.videoMessage, caption: `*DELETED VIDEO*\nFrom: ${upd.key.remoteJid}`}).catch(()=>{});
      } else {
        await sock.sendMessage(ownerJid, {text: `*DELETED MESSAGE*\nFrom: ${upd.key.remoteJid}\nMsg: ${cached.message?.conversation || cached.message?.extendedTextMessage?.text || 'Media/ File Deleted'}`}).catch(()=>{});
      }
    }
  }catch(e){ console.log('onDelete error:', e.message); }
}

// Cache message for antidelete
export function cacheMessage(key, msg){
  cache.set(`${key.remoteJid}_${key.id}`, {message: msg.message, participant: msg.key.participant, timestamp: Date.now()});
  if(cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
}