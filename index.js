const fs = require('fs');
const express = require('express');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
app.use(express.json());
let sock;

app.get('/', (req,res)=> res.send('FURQAN-MD LIVE - /pair?number=923xx'));
app.get('/pair', async (req,res)=>{
  const num = (req.query.number || "").replace(/[^0-9]/g,"");
  if(!num) return res.json({error: "number do"});
  if(!sock) return res.json({error: "wait 5 sec"});
  try{
    const code = await sock.requestPairingCode(num);
    res.json({code});
  }catch(e){ res.json({error: e.message}); }
});

app.listen(process.env.PORT || 3000, ()=> console.log('Bot Ready'));

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
    const { connection, lastDisconnect } = u;
    if(connection === 'open') console.log('FURQAN-MD CONNECTED!');
    if(connection === 'close'){
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if(shouldReconnect) setTimeout(startBot, 3000);
    }
  });
  socket.ev.on('messages.upsert', async (m)=>{
    try{
      const h = require('./handler.js');
      if(h.onMessage) await h.onMessage(socket, m);
    }catch(e){ console.log('handler error', e.message); }
  });
}
startBot();