import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
app.use(express.static(__dirname));
let sockInstance = null;

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));
app.get('/pair', async (req,res)=>{
  const num = (req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.status(400).json({error:'Number do'});
  try{
    if(!sockInstance) return res.json({error:'Bot starting, wait 10s'});
    const code = await sockInstance.requestPairingCode(num);
    res.json({code});
  }catch(e){ res.status(500).json({error:e.message}); }
});
app.listen(process.env.PORT||3000, ()=> console.log('Web on 3000'));

async function startBot(){
  const authDir = './auth';
  fs.mkdirSync(authDir,{recursive:true});
  const {state, saveCreds} = await useMultiFileAuthState(authDir);
  const {version} = await fetchLatestBaileysVersion();
  const logger = pino({level:'silent'});
  const sock = makeWASocket({
    version, logger, printQRInTerminal:false,
    browser: Browsers.macOS('Chrome'),
    auth: {creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger)},
    markOnlineOnConnect:true, syncFullHistory:false,
  });
  sockInstance = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({connection,lastDisconnect})=>{
    if(connection==='open'){
      console.log('✅ SHADOW MD CONNECTED!');
      const { loadCommands } = await import('./handler.js');
      const count = await loadCommands();
      console.log(`✅ ${count} Commands Loaded - API Full Working!`);
    }
    if(connection==='close'){
      const code = lastDisconnect?.error?.output?.statusCode;
      if(code===DisconnectReason.loggedOut) fs.rmSync(authDir,{recursive:true, force:true});
      setTimeout(startBot, 3000);
    }
  });
  
  sock.ev.on('messages.upsert', async (m)=>{
    try{
      const { onMessage } = await import('./handler.js');
      await onMessage(sock, m);
    }catch(e){ console.log('Msg error:', e.message); }
  });

  // YAHI FIX HAI - YE LINE TUMHARI FILE ME MISSING THI
  sock.ev.on('messages.update', async (updates)=>{
    try{
      const { onDelete } = await import('./handler.js');
      await onDelete(sock, updates);
    }catch(e){ console.log('Delete error:', e.message); }
  });
}
startBot();