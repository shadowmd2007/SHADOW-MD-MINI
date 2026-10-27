import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3000;
let status = 'DISCONNECTED';

app.get('/', (req, res) => {
  res.send(`<h1>🌹 ${config.botName} - ${status}</h1>`);
});

async function startBot(){
  if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0) return;
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  const sock = makeWASocket({
    version: (await fetchLatestBaileysVersion()).version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    logger: pino({level:'silent'}),
    browser: ['Safari', 'iPhone', '16.0'],
    markOnlineOnConnect: true,
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', (u)=>{
    if(u.connection==='open'){ status='CONNECTED'; console.log('🌹 CONNECTED SAFARI 🌹'); }
    if(u.connection==='close'){ const r=u.lastDisconnect?.error?.output?.statusCode; if(r!==DisconnectReason.loggedOut) setTimeout(startBot,3000); }
  });

  // ✅ AUTO LOAD - COMMANDS FOLDER KI SARI FILES
  let plugins = new Map();
  const folders = ['commands', 'plugins'];
  for(let folder of folders){
    const path = join(__dirname, folder);
    if(fs.existsSync(path)){
      const files = fs.readdirSync(path).filter(f=>f.endsWith('.js'));
      console.log(`📁 ${folder}: ${files.length} files`);
      for(let f of files){
        try{
          const mod = await import(`file://${join(path,f)}?t=${Date.now()}`);
          const p = mod.default || mod;
          if(p.command){
            plugins.set(f, p);
            console.log(`✅ ${folder}/${f} => ${p.command.join(',')}`);
          }
        }catch(e){ console.log(`❌ ${f}: ${e.message}`); }
      }
    }
  }
  console.log(`🌹 TOTAL LOADED: ${plugins.size} FILES`);

  sock.ev.on('messages.upsert', async (m)=>{
    const msg=m.messages[0];
    if(!msg?.message) return;
    const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
    if(!body.startsWith(config.prefix)) return;
    const args=body.slice(config.prefix.length).trim().split(/ +/);
    const cmd=args.shift().toLowerCase();
    for(let p of plugins.values()){
      if(p.command?.includes(cmd)){
        await p(sock, msg, args, {config});
      }
    }
  });
}
startBot();
app.listen(PORT, ()=> console.log(`Running ${PORT}`));