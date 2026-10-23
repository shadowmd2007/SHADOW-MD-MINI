import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import config from './config.js';
import handleMessage from './handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

// Ensure auth folder exists
if (!fs.existsSync(path.join(__dirname,'auth'))) fs.mkdirSync(path.join(__dirname,'auth'), {recursive:true});

async function startBot() {
  const authPath = path.join(__dirname,'auth','main');
  const {state, saveCreds} = await useMultiFileAuthState(authPath);
  
  const sock = makeWASocket({
    auth: {creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))},
    logger: pino({level:'silent'}),
    browser: Browsers.macOS('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: true
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const {connection, lastDisconnect} = update;
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log("Connection closed, reconnecting:", shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log("✅ SHADOW MD Connected! 77 Commands Loaded");
      await sock.sendMessage(sock.user.id, {text: `*${config.botName} Connected Successfully!* ✅\n\nType ${config.prefix}menu`});
    }
  });

  sock.ev.on('messages.upsert', async ({messages}) => {
    const m = messages[0];
    if (!m.message) return;
    await handleMessage(sock, m);
  });
}

// Start bot if already paired
if (fs.existsSync(path.join(__dirname,'auth','main','creds.json'))) {
  startBot();
}

// --- WEB PAIR SITE ---
app.get('/', (req,res)=>{
res.send(`
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>SHADOW MD</title>
<style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#111;border:1px solid #222;border-radius:20px;padding:25px;width:90%;max-width:400px;text-align:center}.logo{width:150px;height:150px;border-radius:50%;border:3px solid #00ff88}.green{color:#00ff88}input{width:100%;padding:15px;border-radius:12px;border:1px solid #333;background:#000;color:#fff;text-align:center;font-size:18px;margin:15px 0;outline:none}button{width:100%;padding:15px;border-radius:12px;border:none;background:#00ff88;color:#000;font-weight:bold;font-size:18px;cursor:pointer}#codeBox{margin-top:15px;font-size:24px;letter-spacing:4px;display:none;background:#000;padding:15px;border-radius:12px;border:2px dashed #00ff88}</style>
</head><body><div class="card">
<img class="logo" src="https://i.imgur.com/8Km9tLL.jpeg">
<h1>SHADOW MD</h1><p class="green">COMMANDS: 77 Loaded</p>
<input id="num" type="tel" autocomplete="off" autocorrect="off" spellcheck="false" placeholder="923003719761" value="">
<button id="btn">Get Pair Code</button><div id="codeBox"></div>
<p style="font-size:11px;color:#777;margin-top:15px">Go to WhatsApp > Linked Devices > Link with phone number<br>Enter code within 30 sec</p>
</div>
<script>
window.onload = () => { document.getElementById('num').value = ""; document.getElementById('num').focus(); }
document.getElementById('btn').onclick = async () => {
  const n = document.getElementById('num').value.replace(/[^0-9]/g,'').trim();
  if(!n || n.length < 10) return alert('Sahi number likho! Ex: 923003719761');
  const btn = document.getElementById('btn'); btn.innerText='Generating... ⏳'; btn.disabled=true;
  try{
    const r = await fetch('/pair?number='+n); const d = await r.json();
    if(d.code){ document.getElementById('codeBox').style.display='block'; document.getElementById('codeBox').innerText=d.code; }
    else alert(d.error||'Pair failed, try again');
  }catch(e){ alert('Server error, try Clear Cache Deploy'); }
  btn.innerText='Get Pair Code'; btn.disabled=false;
}
</script></body></html>
`);
});

app.get('/pair', async (req,res)=>{
  let num = (req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number dalo'});
  const authMain = path.join(__dirname,'auth','main');
  const tempDir = path.join(__dirname,'auth','temp_'+num);
  try{
    if(fs.existsSync(tempDir)) fs.rmSync(tempDir,{recursive:true,force:true});
    if(fs.existsSync(authMain)) fs.rmSync(authMain,{recursive:true,force:true});
    fs.mkdirSync(tempDir,{recursive:true});
    const {state,saveCreds}=await useMultiFileAuthState(tempDir);
    const sock=makeWASocket({auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'}))},logger:pino({level:'silent'}),browser:Browsers.macOS('Chrome'),printQRInTerminal:false});
    sock.ev.on('creds.update',saveCreds);
    await new Promise(r=>setTimeout(r,3500));
    if(!sock.authState.creds.registered){
      const code=await sock.requestPairingCode(num);
      console.log("PAIR CODE:",code,"for",num);
      res.json({code});
      sock.ev.on('connection.update', async (u)=>{
        if(u.connection==='open'){
          console.log("✅ PAIRED, Moving to main auth");
          if(fs.existsSync(authMain)) fs.rmSync(authMain,{recursive:true,force:true});
          fs.cpSync(tempDir, authMain, {recursive:true});
          try{fs.rmSync(tempDir,{recursive:true,force:true})}catch{}
          startBot();
        }
      });
      setTimeout(()=>{try{sock.end()}catch{}}, 150000);
    } else { res.json({error:'Already registered'}); }
  }catch(e){ console.log("PAIR ERROR:",e); res.json({error:e.message}); }
});

app.listen(PORT, ()=>console.log("✅ SHADOW MD Running on "+PORT+" | Node "+process.version));