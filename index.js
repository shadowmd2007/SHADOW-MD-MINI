import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import pino from 'pino';
import Baileys from '@whiskeysockets/baileys';

const makeWASocket = Baileys.default || Baileys.makeWASocket;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = Baileys;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
let sockInstance = null;

app.get('/', (req,res)=>{
  const htmlPath = path.join(__dirname, 'index.html');
  if(fs.existsSync(htmlPath)){
    return res.sendFile(htmlPath);
  } else {
    return res.send('<h2>Bot Running - Go to /pair?number=923xx</h2>');
  }
});

app.get('/pair', async (req,res)=>{
 const num = (req.query.number || "").replace(/[^0-9]/g,"");
 if(!num) return res.json({error: "Number do ?number=92300..."});
 if(!sockInstance) return res.json({error: "Bot starting, wait 10 sec and refresh"});
 try{
   const code = await sockInstance.requestPairingCode(num);
   console.log('PAIR CODE:', code);
   return res.json({code});
 }catch(e){
   return res.json({error: e.message});
 }
});

app.listen(process.env.PORT || 3000, ()=> console.log('Web on 3000 - Bot Ready'));

async function startBot(){
 try{
  const authDir = './auth';
  if(!fs.existsSync(authDir)) fs.mkdirSync(authDir, {recursive:true});
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();
  const sock = makeWASocket({
    version,
    logger: pino({level: 'silent'}),
    printQRInTerminal: false,
    browser: ["Chrome", "Chrome", "1.0"],
    auth: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))
  });
  sockInstance = sock;
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log('CONNECTED!');
    if(u.connection === 'close'){
      const code = u.lastDisconnect?.error?.output?.statusCode;
      if(code !== DisconnectReason.loggedOut){
        console.log('Reconnecting...');
        setTimeout(startBot, 3000);
      }
    }
  });

  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const { onMessage } = await import('./handler.js');
      await onMessage(sock, m);
    }catch(e){ console.log('handler error', e.message); }
  });
 }catch(e){
  console.log('StartBot Error:', e.message);
  console.log(e.stack);
  setTimeout(startBot, 5000);
 }
}

process.on('uncaughtException', (e)=> console.log('Uncaught:', e.message));
process.on('unhandledRejection', (e)=> console.log('Unhandled:', e.message));

startBot();