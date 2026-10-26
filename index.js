import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, delay } from '@whiskeysockets/baileys';
import P from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOT_NAME = 'RANA FURQAN MD';
const POWERED_BY = 'MERI JAAN';
const DP_URL = process.env.BOT_DP || 'https://files.catbox.moe/y04tbj.jpg';
const PORT = process.env.PORT || 3000;
const PREFIX = process.env.PREFIX || '.';

global.commands = new Map();

// BUILT-IN COMMANDS
global.commands.set('ping', {
  name: 'ping',
  run: async ({ sock, jid, m }) => {
    await sock.sendMessage(jid, { text: `🏓 *Pong!* ${BOT_NAME} is Alive! 🌹` }, { quoted: m });
  }
});
global.commands.set('alive', {
  name: 'alive',
  run: async ({ sock, jid, m }) => {
    await sock.sendMessage(jid, { text: `✅ *${BOT_NAME} ONLINE*\n🌹 POWERED BY ${POWERED_BY} 🌹` }, { quoted: m });
  }
});
global.commands.set('menu', {
  name: 'menu',
  run: async ({ sock, jid, m }) => {
    let list = [...global.commands.keys()].join(', ');
    await sock.sendMessage(jid, { text: `*🌹 ${BOT_NAME} MENU 🌹*\n\nCommands: ${list}\n\nUse ${PREFIX}command` }, { quoted: m });
  }
});
global.commands.set('vv2', global.commands.get('menu'));

const app = express();
app.get('/', (req,res)=>res.send(`<h2 style="text-align:center">🌹 ${BOT_NAME} Connected 🌹<br>Try ${PREFIX}ping</h2>`));
app.get('/code', (req,res)=>res.send('<h2>Already Paired</h2>'));
app.listen(PORT, ()=>console.log(`Live on ${PORT}`));

async function loadCommands() {
  const p = path.join(__dirname, 'commands');
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  const files = fs.readdirSync(p).filter(f=>f.endsWith('.js'));
  for(const file of files){
    try{
      const mod = await import(`file://${path.join(p,file)}?update=${Date.now()}`);
      const cmd = mod.command || mod.default;
      if(cmd?.name){
        global.commands.set(cmd.name.toLowerCase(), cmd);
        if(cmd.aliases) cmd.aliases.forEach(a=>global.commands.set(a.toLowerCase(), cmd));
        console.log(`✅ Loaded: ${cmd.name}`);
      }
    }catch(e){console.log(`❌ ${file}: ${e.message}`)}
  }
  console.log(`📦 Total Commands: ${global.commands.size}`);
}

async function startBot(){
  const {state, saveCreds} = await useMultiFileAuthState('./auth');
  const {version} = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    auth: {creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, P({level:'silent'}))},
    logger: P({level:'silent'}),
    browser: ["Ubuntu","Chrome","20.0.04"],
    markOnlineOnConnect: true
  });
  await loadCommands();
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({connection, lastDisconnect})=>{
    if(connection==='close'){
      if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut){
        await delay(3000); startBot();
      }
    }else if(connection==='open'){
      console.log(`✅ ${BOT_NAME} CONNECTED - READY FOR ALL CHATS`);
    }
  });

  // ===== UNIVERSAL MESSAGE HANDLER - PERSONAL + OTHERS DONO PE CHALEGA =====
  sock.ev.on('messages.upsert', async (upsert)=>{
    try{
      if(upsert.type !== 'notify') return;
      const msg = upsert.messages?.[0];
      if(!msg || !msg.message) return;

      let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
      if(!text) return;
      text = text.trim();
      if(!text.startsWith(PREFIX)) return;

      const from = msg.key.remoteJid;
      const isFromMe = msg.key.fromMe; // Personal (You) pe true hota hai
      const args = text.slice(PREFIX.length).trim().split(/ +/);
      const cmdName = args.shift().toLowerCase();
      const command = global.commands.get(cmdName);
      if(!command) return;

      console.log(`📩 ${PREFIX}${cmdName} from ${from} | fromMe=${isFromMe} | Group=${from.endsWith('@g.us')}`);

      // Context - Sab jagah kaam karega
      const ctx = {
        sock,
        jid: from,
        m: msg,
        args,
        prefix: PREFIX,
        sender: from.endsWith('@g.us') ? msg.key.participant : from,
        isGroup: from.endsWith('@g.us'),
        isOwner: isFromMe, // Tum owner ho
        reply: async (txt) => await sock.sendMessage(from, { text: txt }, { quoted: msg })
      };

      await command.run(ctx);
      console.log(`✅ Done: ${cmdName}`);

    }catch(e){console.log('Error:', e.message)}
  });
}
startBot();