import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from '@whiskeysockets/baileys';
const makeWASocket = pkg.default || pkg.makeWASocket;
import { useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import pino from 'pino';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req,res)=>{
  res.send(`
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>SHADOW MD</title>
<style>body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}.card{background:#111;border:1px solid #222;border-radius:20px;padding:24px;width:92%;max-width:380px;text-align:center}img{width:130px;height:130px;border-radius:50%;border:3px solid #00ff88}input{width:100%;padding:14px;border-radius:12px;border:1px solid #333;background:#000;color:#fff;text-align:center;font-size:18px;margin:18px 0;outline:none}button{width:100%;padding:14px;border-radius:12px;border:none;background:#00ff88;color:#000;font-weight:bold;font-size:18px}#box{margin-top:14px;font-size:28px;letter-spacing:4px;display:none;background:#000;padding:14px;border-radius:12px;border:2px dashed #00ff88}</style>
</head><body><div class="card">
<img src="https://i.imgur.com/8Km9tLL.jpeg"><h2>SHADOW MD</h2>
<p style="color:#00ff88">PAIR CODE</p>
<input id="num" type="tel" autocomplete="off" placeholder="923003719761" value="">
<button id="btn">Get Pair Code</button><div id="box"></div>
<p style="font-size:11px;color:#777;margin-top:10px">WhatsApp > Linked Devices > Link with phone number > 8 Digit Code</p>
</div>
<script>
document.getElementById('btn').onclick=async()=>{
  let n=document.getElementById('num').value.replace(/[^0-9]/g,'');
  if(n.length<10) return alert('Number sahi likho');
  let b=document.getElementById('btn'); b.innerText='Wait 8 sec...'; b.disabled=true;
  try{
    let r=await fetch('/pair?number='+n); let d=await r.json();
    if(d.code){ let x=document.getElementById('box'); x.style.display='block'; x.innerText=d.code; alert('Code: '+d.code+'\\nAb 30 sec ke andar WhatsApp me dalo!'); }
    else alert(d.error);
  }catch(e){ alert('Server busy, 10 sec baad try karo'); }
  b.innerText='Get Pair Code'; b.disabled=false;
}
</script></body></html>`);
});

app.get('/pair', async (req,res)=>{
  let num=(req.query.number||'').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number do'});
  const tempPath=path.join(__dirname,'auth_'+num);
  try{
    if(fs.existsSync(tempPath)) fs.rmSync(tempPath,{recursive:true,force:true});
    fs.mkdirSync(tempPath,{recursive:true});
    const {state, saveCreds}=await useMultiFileAuthState(tempPath);
    const sock=makeWASocket({
      auth:{creds:state.creds, keys:makeCacheableSignalKeyStore(state.keys, pino({level:'silent'}))},
      logger:pino({level:'silent'}),
      browser: Browsers.macOS('Chrome'),
      printQRInTerminal:false
    });
    sock.ev.on('creds.update', saveCreds);
    await new Promise(r=>setTimeout(r,5000));
    if(!sock.authState.creds.registered){
      const code=await sock.requestPairingCode(num);
      console.log('CODE:',code);
      res.json({code});
      // keep alive 3 min for WhatsApp to catch
      setTimeout(()=>{ try{fs.rmSync(tempPath,{recursive:true,force:true})}catch{} }, 180000);
    } else res.json({error:'Already registered'});
  }catch(e){
    console.log('PAIR ERR',e.message);
    res.json({error: e.message.includes('Closed') ? 'Connection Closed - 10 sec baad dobara dabao, 2nd try me code ayega' : e.message});
  }
});

app.listen(PORT, ()=>console.log('LIVE ON '+PORT));