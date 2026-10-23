import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@whiskeysockets/baileys';
const makeWASocket = pkg.default || pkg.makeWASocket;
import { useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys';
import pino from 'pino';
import { config } from './config.js';
import handleMessage from './handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

if (!fs.existsSync(path.join(__dirname, 'auth'))) fs.mkdirSync(path.join(__dirname, 'auth'), {recursive:true});

async function startBot(){
  const authPath = path.join(__dirname, 'auth', 'main');
  const { state, saveCreds } = await useMultiFileAuthState(authPath);
  const sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
    logger: pino({level:'silent'}),
    browser: Browsers.macOS('Chrome'),
    printQRInTerminal: false,
    markOnlineOnConnect: true
  });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async (u)=>{
    if(u.connection==='close'){
      const code = u.lastDisconnect?.error?.output?.statusCode;
      if(code !== DisconnectReason.loggedOut) startBot();
    } else if(u.connection==='open'){
      console.log('✅ SHADOW MD CONNECTED - 77 Commands');
    }
  });
  sock.ev.on('messages.upsert', async ({messages})=>{
    const m = messages[0]; if(!m.message) return;
    await handleMessage(sock, m);
  });
}

if(fs.existsSync(path.join(__dirname,'auth','main','creds.json'))){
  startBot();
}

app.get('/', (req,res)=>{
  res.send(`
<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SHADOW MD</title>
<style>
body{background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#101010;border:1px solid #222;border-radius:20px;padding:24px;width:92%;max-width:380px;text-align:center;box-shadow:0 0 30px #00ff8822}
.logo{width:130px;height:130px;border-radius:50%;border:3px solid #00ff88;object-fit:cover}
h1{margin:12px 0 2px} .green{color:#00ff88;margin:0}
input{width:100%;padding:14px;border-radius:12px;border:1px solid #333;background:#000;color:#fff;text-align:center;font-size:18px;margin:18px 0;box-sizing:border-box;outline:none}
button{width:100%;padding:14px;border-radius:12px;border:none;background:#00ff88;color:#000;font-weight:bold;font-size:18px}
#codeBox{margin-top:16px;font-size:28px;letter-spacing:5px;display:none;background:#000;padding:14px;border-radius:12px;border:2px dashed #00ff88;font-weight:bold}
</style></head><body><div class="card">
<img class="logo" src="${config.imageUrl}">
<h1>SHADOW MD</h1><p class="green">COMMANDS: 77 Loaded</p>
<input id="num" type="tel" inputmode="numeric" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="923003719761">
<button id="btn">Get Pair Code</button><div id="codeBox"></div>
<p style="font-size:11px;color:#666;margin-top:14px">WhatsApp > Linked Devices > Link with phone number</p>
</div>
<script>
window.onload=()=>{document.getElementById('num').value='';}
document.getElementById('btn').onclick=async()=>{
  const el=document.getElementById('num');
  let n=el.value.replace(/[^0-9]/g,'').trim();
  if(n.length<10) return alert('Sahi number likho: 923003719761');
  const btn=document.getElementById('btn'); btn.innerText='Generating...'; btn.disabled=true;
  try{
    const r=await fetch('/pair?number='+n); const d=await r.json();
    if(d.code){ const b=document.getElementById('codeBox'); b.style.display='block'; b.innerText=d.code; }
    else alert(d.error||'Failed');
  }catch(e){ alert('Server error'); }
  btn.innerText='Get Pair Code'; btn.disabled=false;
}
</script></body></html>`);
});

app.get('/pair', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number required'});
  const mainPath=path.join(__dirname,'auth','main');
  const tempPath=path.join(__dirname,'auth','temp_'+num);
  try{
    if(fs.existsSync(tempPath)) fs.rmSync(tempPath,{recursive:true,force:true});
    if(fs.existsSync(mainPath)) fs.rmSync(mainPath,{recursive:true,force:true});
    fs.mkdirSync(tempPath,{recursive:true});
    const {state, saveCreds}=await useMultiFileAuthState(tempPath);
    const sock=makeWASocket({
      auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))},
      logger:pino({level:'silent'}), browser:Browsers.macOS('Chrome'), printQRInTerminal:false
    });
    sock.ev.on('creds.update', saveCreds);
    await new Promise(r=>setTimeout(r,3000));
    if(!sock.authState.creds.registered){
      const code=await sock.requestPairingCode(num);
      console.log('PAIR CODE FOR '+num+': '+code);
      res.json({code});
      sock.ev.on('connection.update', async (u)=>{
        if(u.connection==='open'){
          if(fs.existsSync(mainPath)) fs.rmSync(mainPath,{recursive:true,force:true});
          fs.cpSync(tempPath, mainPath, {recursive:true});
          try{fs.rmSync(tempPath,{recursive:true,force:true})}catch{}
          console.log('✅ Session saved!'); startBot();
        }
      });
      setTimeout(()=>{try{sock.end()}catch{}}, 180000);
    } else res.json({error:'Already registered'});
  }catch(e){ console.log(e); res.json({error:e.message}); }
});

app.listen(PORT, ()=>console.log('RUNNING ON '+PORT+' NODE '+process.version));