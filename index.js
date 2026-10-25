const fs = require('fs');
const express = require('express');
const pino = require('pino');
const Baileys = require('@whiskeysockets/baileys');

const makeWASocket = Baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = Baileys;

const app = express();
app.use(express.json());
let sock;

app.get('/', (req,res)=> res.send('FURQAN-MD Running on Node 22 - /pair?number=923xx'));
app.get('/pair', async (req,res)=>{
  const num = (req.query.number || "").replace(/[^0-9]/g,"");
  if(!num) return res.json({error: "number do ?number=923xx"});
  if(!sock) return res.json({error: "wait 5 sec, bot starting"});
  try{
    const code = await sock.requestPairingCode(num);
    res.json({code: code, message: "WhatsApp me ye code dalo"});
  }catch(e){ res.json({error: e.message}); }
});

app.listen(process.env.PORT || 3000, ()=> console.log('Bot Ready on Node 22'));

async function startBot(){
  if(!fs.existsSync('./auth')) fs.mkdirSync('./auth',{recursive:true});
  const { state, saveCreds } = await useMultiFileAuthState('./auth');
  const { version } = await fetchLatestBaileysVersion();
  const socket = makeWASocket({
    version,
    logger: pino({level:'silent'}),
    printQRInTerminal: false,
    browser: ["FURQAN-MD","Chrome","1.0"],
    auth: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))
  });
  sock = socket;
  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', (u)=>{
    if(u.connection === 'open') console.log('FURQAN-MD CONNECTED - Node 22 pe chal gaya!');
    if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
  });
  try{
    socket.ev.on('messages.upsert', async (m)=>{
      const handler = require('./handler.js');
      if(handler.onMessage) await handler.onMessage(socket, m);
    });
  }catch{}
}
startBot();