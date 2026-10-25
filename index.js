import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import pino from 'pino';
import pkg from '@whiskeysockets/baileys';
const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, DisconnectReason } = pkg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use(express.json());
let sockInstance = null;

app.get('/', (req,res)=> res.sendFile(path.join(__dirname, 'index.html')));

app.get('/pair', async (req,res)=>{
 const num = (req.query.number || "").replace(/[^0-9]/g,"");
 if(!num) return res.json({error: "Number do"});
 if(!sockInstance) return res.json({error: "Bot not started, wait 10s"});
 try{
   const code = await sockInstance.requestPairingCode(num);
   console.log('FURQAN-MD PAIR CODE:', code);
   return res.json({code, bot: "FURQAN-MD"});
 }catch(e){
   return res.json({error: e.message});
 }
});

app.listen(process.env.PORT || 3000, ()=> console.log('Web on 3000 - FURQANMD READY'));

async function startBot(){
 const authDir = './auth';
 fs.mkdirSync(authDir, {recursive:true});
 const { state, saveCreds } = await useMultiFileAuthState(authDir);
 const { version } = await fetchLatestBaileysVersion();
 const sock = makeWASocket({
   version,
   logger: pino({level: 'silent'}),
   printQRInTerminal: false,
   browser: ["FURQAN-MD", "Chrome", "1.0"],
   auth: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))
 });
 sockInstance = sock;
 sock.ev.on('creds.update', saveCreds);
 
 sock.ev.on('connection.update', async (update)=>{
   const { connection, lastDisconnect } = update;
   if(connection === 'open'){
     console.log('FURQAN-MD CONNECTED!');
   }
   if(connection === 'close'){
     if(lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut){
       setTimeout(startBot, 3000);
     }
   }
 });

 sock.ev.on('messages.upsert', async (m)=>{
   const { onMessage } = await import('./handler.js');
   await onMessage(sock, m);
 });
}

startBot();