import fs from 'fs';
import path from 'path';
import express from 'express';
import pino from 'pino';
import { fileURLToPath } from 'url';
import pkg from '@whiskeysockets/baileys';
import { onMessage } from './handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const makeWASocket = pkg.default || pkg.makeWASocket;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = pkg;

const app = express();
app.use(express.json());
let sock;

app.get('/', (req,res)=>{
  const p = path.join(__dirname, 'index.html');
  if(fs.existsSync(p)) res.sendFile(p);
  else res.send('<h1>FURQAN-MD LIVE</h1>');
});

app.get('/pair', async (req,res)=>{
  const num = (req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'number do'});
  if(!sock) return res.json({error:'Wait 10 sec'});
  try{
    const code = await sock.requestPairingCode(num);
    res.json({code});
  }catch(e){ res.json({error:e.message}); }
});

app.listen(process.env.PORT||3000, ()=> console.log('Bot Ready'));

async function startBot(){
  if(!fs.existsSync('./auth')) fs.mkdirSync('./auth',{recursive:true});
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    printQRInTerminal:false,
    browser:['FURQAN-MD','Chrome','1.0'],
    auth:{ creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) }
  });
  sock = socket;
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', (u)=>{
    if(u.connection==='open') console.log('CONNECTED!');
    if(u.connection==='close' && u.lastDisconnect?.error?.output?.statusCode!==DisconnectReason.loggedOut) setTimeout(startBot,3000);
  });
  socket.ev.on('messages.upsert', (m)=> onMessage(socket, m));
}
startBot();