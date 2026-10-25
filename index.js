import fs from 'fs';
import express from 'express';
import pino from 'pino';
import { default as makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys';
import { onMessage } from './handler.js';

const app = express();
app.use(express.json());
let sock;

app.get('/', (req,res)=> {
  res.send(`
  <html><body style="font-family:sans-serif;text-align:center;padding:50px">
  <h1>FURQAN-MD LIVE ✅</h1>
  <p>Bot is Running on Render!</p>
  <form action="/pair" method="get">
  <input name="number" placeholder="923xxxxxxxx" style="padding:12px;width:220px" required>
  <button style="padding:12px 20px;background:#25D366;color:white;border:none">Get Pair Code</button>
  </form>
  <p>Direct: /pair?number=923xx</p>
  </body></html>
  `);
});

app.get('/pair', async (req,res)=>{
  const num = (req.query.number || "").replace(/[^0-9]/g,"");
  if(!num) return res.send('Number do ?number=923xx');
  if(!sock) return res.json({error: "Bot starting, wait 10 sec"});
  try{
    const code = await sock.requestPairingCode(num);
    res.json({code, message: "WhatsApp > Linked Devices > Pair with code"});
  }catch(e){ res.json({error: e.message}); }
});

app.listen(process.env.PORT || 3000, ()=> console.log('Bot Ready - ESM'));

async function startBot(){
  if(!fs.existsSync('./auth')) fs.mkdirSync('./auth',{recursive:true});
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    browser: ["FURQAN-MD","Chrome","1.0"],
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))
    }
  });
  sock = socket;
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log('FURQAN-MD CONNECTED!');
    if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
  });
  socket.ev.on('messages.upsert', (m)=> onMessage(socket, m));
}
startBot();