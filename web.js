import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const Browsers = baileys.Browsers;
const makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;
let activeSockets = {};

// ✅ PURE CLEAR - Direct SHADOW Pic - No IBB
const DIRECT_PIC = "https://i.imgur.com/8Km9tLL.jpeg";

app.get('/', async (req, res) => {
  res.send(`
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>SHADOW-MD MINI</title>
<style>body{margin:0;padding:0;background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh} .box{background:#111;border:1px solid #333;border-radius:20px;padding:25px;width:92%;max-width:380px;text-align:center} .logo{width:130px;height:130px;border-radius:50%;border:3px solid #00ff88;object-fit:cover;margin-bottom:15px} input{width:100%;padding:14px;border-radius:12px;border:1px solid #333;background:#000;color:#fff;text-align:center;font-size:18px;margin:12px 0;outline:none;box-sizing:border-box} button{width:100%;padding:14px;border-radius:12px;border:none;background:#00ff88;color:#000;font-weight:bold;font-size:18px;cursor:pointer} #codeBox{margin-top:14px;font-size:28px;letter-spacing:4px;display:none;background:#000;padding:14px;border-radius:12px;border:2px dashed #00ff88;font-weight:bold}</style>
</head><body><div class="box">
<img class="logo" src="${DIRECT_PIC}">
<h2>SHADOW - MD</h2><p style="color:#00ff88">COMMANDS: 77 Loaded</p>
<input id="num" type="tel" autocomplete="off" placeholder="92300xxxxxxx" value="">
<button id="btn">Get Pair Code</button><div id="codeBox"></div>
<p style="font-size:11px;color:#777;margin-top:12px">WhatsApp > Linked Devices > Link with phone number</p>
</div>
<script>
document.getElementById('btn').onclick=async()=>{
  let n=document.getElementById('num').value.replace(/[^0-9]/g,'');
  if(n.length<10) return alert('Number sahi likho');
  let b=document.getElementById('btn'); b.innerText='Wait 6 sec...'; b.disabled=true;
  try{
    let r=await fetch('/pair?number='+n); let d=await r.json();
    if(d.code){ let x=document.getElementById('codeBox'); x.style.display='block'; x.innerText=d.code; 
      if(Notification && Notification.permission==='granted'){ new Notification('SHADOW-MD Pair Code', {body:'Code: '+d.code}); }
      if(navigator.vibrate) navigator.vibrate(200);
    } else alert(d.error||'Failed');
  }catch(e){ alert('Server Error, 10 sec baad try karo'); }
  b.innerText='Get Pair Code'; b.disabled=false;
}
if('Notification' in window && Notification.permission!=='granted'){ Notification.requestPermission(); }
</script></body></html>`);
});

app.get('/pair', async (req, res) => {
  let num = (req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number dalo'});
  const tempDir = path.join(__dirname, 'auth', 'temp_'+num);
  if(fs.existsSync(tempDir)) fs.rmSync(tempDir,{recursive:true,force:true});
  fs.mkdirSync(tempDir,{recursive:true});
  if(activeSockets[num]){ try{ activeSockets[num].end(); }catch{} delete activeSockets[num]; }
  try{
    const { state, saveCreds } = await useMultiFileAuthState(tempDir);
    const sock = makeWASocket({
      auth:{ creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
      logger: pino({level:'silent'}),
      browser: Browsers.macOS('Chrome'),
      printQRInTerminal:false
    });
    activeSockets[num] = sock;
    sock.ev.on('creds.update', saveCreds);
    await new Promise(r=>setTimeout(r,4000));
    if(!sock.authState.creds.registered){
      const code = await sock.requestPairingCode(num);
      console.log('PAIR CODE FOR '+num+': '+code);
      res.json({code});
      sock.ev.on('connection.update', async (u)=>{
        if(u.connection==='open'){
          console.log('PAIRED SUCCESS '+num);
          const mainDir = path.join(__dirname, 'auth', 'main');
          if(!fs.existsSync(mainDir)) fs.mkdirSync(mainDir,{recursive:true});
          fs.readdirSync(tempDir).forEach(f=>{
            fs.copyFileSync(path.join(tempDir,f), path.join(mainDir,f));
          });
          console.log('Session saved to main');
          setTimeout(()=>{ process.exit(0); }, 2000);
        }
      });
    } else {
      res.json({error:'Already paired'});
    }
    setTimeout(()=>{ try{ sock.end(); }catch{} delete activeSockets[num]; }, 120000);
  }catch(e){
    console.log('PAIR ERROR:', e.message);
    res.json({error: 'Failed: '+ e.message});
  }
});

app.listen(PORT, '0.0.0.0', ()=> console.log('WEB Running with direct pic on '+PORT));