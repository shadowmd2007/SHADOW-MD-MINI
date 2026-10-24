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
let saveCredsInstance = null;

app.get('/', (req,res)=> res.sendFile(path.join(__dirname,'index.html')));

// YE HAI ASAL PAIRING API - index.html isi ko call karti hai
app.get('/pair', async (req,res)=>{
  const num = req.query.number || req.query.num;
  if(!num) return res.sendFile(path.join(__dirname,'index.html'));
  
  const clean = num.replace(/[^0-9]/g,'');
  console.log('Pair request for:', clean);
  
  try{
    if(!sockInstance) return res.json({error:'Bot abhi start ho raha hai, 10 sec baad try karo'});
    if(sockInstance.authState.creds.registered){
      return res.json({error:'Already paired, auth folder delete karo'});
    }
    const code = await sockInstance.requestPairingCode(clean);
    console.log('Generated code:', code);
    res.json({code: code});
  }catch(e){
    console.log('Pair error:', e.message);
    res.status(500).json({error: e.message});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Web Running on '+PORT));

async function startBot(){
  const authDir = './auth';
  fs.mkdirSync(authDir, {recursive:true});
  const {state, saveCreds} = await useMultiFileAuthState(authDir);
  saveCredsInstance = saveCreds;
  const {version} = await fetchLatestBaileysVersion();
  const logger = pino({level:'silent'});

  const sock = makeWASocket({
    version, logger, printQRInTerminal:false,
    browser: Browsers.macOS('Chrome'),
    auth: {creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger)},
  });
  sockInstance = sock;
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', ({connection,lastDisconnect})=>{
    if(connection==='open'){
      console.log('✅ SHADOW MD CONNECTED!');
    }
    if(connection==='close'){
      const reason = lastDisconnect?.error?.output?.statusCode;
      console.log('Closed:', reason);
      if(reason === DisconnectReason.loggedOut){
        fs.rmSync(authDir, {recursive:true, force:true});
      }
      setTimeout(startBot, 3000);
    }
  });
}
startBot();