import fs from 'fs';
import express from 'express';
import pino from 'pino';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const Baileys = require('@whiskeysockets/baileys');

const makeWASocket = Baileys.default || Baileys.makeWASocket || Baileys;
const useMultiFileAuthState = Baileys.useMultiFileAuthState || Baileys.default?.useMultiFileAuthState;
const fetchLatestBaileysVersion = Baileys.fetchLatestBaileysVersion || Baileys.default?.fetchLatestBaileysVersion;
const makeCacheableSignalKeyStore = Baileys.makeCacheableSignalKeyStore || Baileys.default?.makeCacheableSignalKeyStore;
const DisconnectReason = Baileys.DisconnectReason || Baileys.default?.DisconnectReason;

const app = express();
app.use(express.json());
let sockInstance = null;

app.get('/', (req,res)=> res.send('<h1>FURQAN-MD Ready</h1><a href="/pair?number=923001234567">Pair</a>'));
app.get('/pair', async (req,res)=>{
 const num = (req.query.number || "").replace(/[^0-9]/g,"");
 if(!num) return res.json({error: "Add ?number=923xx"});
 if(!sockInstance) return res.json({error: "Bot starting, wait 5 sec"});
 try{
   const code = await sockInstance.requestPairingCode(num);
   return res.json({code: code, message: "Code WhatsApp me dalo"});
 }catch(e){ return res.json({error: e.message}); }
});
app.listen(process.env.PORT || 3000, ()=> console.log('Bot Ready'));

async function startBot(){
 if(!fs.existsSync('./auth')) fs.mkdirSync('./auth', {recursive:true});
 const { state, saveCreds } = await useMultiFileAuthState('./auth');
 const { version } = await fetchLatestBaileysVersion();
 const sock = makeWASocket({
   version,
   logger: pino({level: 'silent'}),
   printQRInTerminal: false,
   browser: ["FURQAN-MD","Chrome","1.0"],
   auth: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))
 });
 sockInstance = sock;
 sock.ev.on('creds.update', saveCreds);
 sock.ev.on('connection.update', (u)=>{
   if(u.connection === 'open') console.log('FURQAN-MD CONNECTED - Ab kuch nahi karna!');
   if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
 });
 sock.ev.on('messages.upsert', async (m)=>{
   try{ const { onMessage } = await import('./handler.js'); await onMessage(sock, m); }catch{}
 });
}
startBot();