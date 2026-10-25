import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
let sockInstance = null;

app.get('/', (req,res)=> res.send('Bot Running - /pair?number=92xxx'));
app.get('/pair', async (req,res)=>{
 const num = (req.query.number || "").replace(/[^0-9]/g,"");
 if(!num) return res.json({error: "Number do"});
 if(!sockInstance) return res.json({error: "Wait 10 sec"});
 try{
   const code = await sockInstance.requestPairingCode(num);
   return res.json({code});
 }catch(e){ return res.json({error: e.message}); }
});
app.listen(process.env.PORT || 3000, ()=> console.log('Web on 3000 - Bot Ready'));

async function startBot(){
 const authDir = './auth';
 if(!fs.existsSync(authDir)) fs.mkdirSync(authDir, {recursive:true});
 const { state, saveCreds } = await useMultiFileAuthState(authDir);
 const { version } = await fetchLatestBaileysVersion();
 const sock = makeWASocket({
   version,
   logger: pino({level: 'silent'}),
   printQRInTerminal: false,
   browser: ["Chrome","Chrome","1.0"],
   auth: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))
 });
 sockInstance = sock;
 sock.ev.on('creds.update', saveCreds);
 sock.ev.on('connection.update', (u)=>{
   if(u.connection === 'open') console.log('CONNECTED!');
   if(u.connection === 'close' && u.lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut) setTimeout(startBot, 3000);
 });
 sock.ev.on('messages.upsert', async (m)=>{
   const { onMessage } = await import('./handler.js');
   await onMessage(sock, m);
 });
}
startBot();