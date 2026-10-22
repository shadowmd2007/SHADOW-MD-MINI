import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
// Ye line sab se important hai - is se makeWASocket error khatam hoga
const baileys = require('@whiskeysockets/baileys');
const makeWASocket = baileys.default;
const useMultiFileAuthState = baileys.useMultiFileAuthState;
const Browsers = baileys.Browsers;
const makeCacheableSignalKeyStore = baileys.makeCacheableSignalKeyStore;
const delay = baileys.delay || ((ms) => new Promise(r => setTimeout(r, ms)));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req,res)=>{
  res.send(`<html><body style="background:#0a0a0a;color:white;display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif"><div style="background:#1a1a1a;padding:30px;border-radius:15px;text-align:center"><h2>SHADOW-MD MINI</h2><p>COMMANDS: 77 Loaded</p><input id="num" style="padding:12px;width:80%;border-radius:8px;border:none" placeholder="923003719761"/><br/><br/><button onclick="pair()" style="padding:12px 25px;background:#25D366;border:none;border-radius:8px;color:white;font-weight:bold;cursor:pointer">Get Pair Code</button><p id="code" style="font-size:28px;color:#25D366;margin-top:20px"></p></div><script>async function pair(){const n=document.getElementById('num').value;document.getElementById('code').innerText='Generating...';const r=await fetch('/pair?number='+n);const d=await r.json();document.getElementById('code').innerText=d.code||d.error}</script></body></html>`);
});

app.get('/pair', async (req,res)=>{
  let num = req.query.number?.replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number missing'});
  const dir = path.join(__dirname,'auth','temp_'+num);
  if(fs.existsSync(dir)) fs.rmSync(dir,{recursive:true,force:true});
  fs.mkdirSync(dir,{recursive:true});
  try{
    const {state,saveCreds} = await useMultiFileAuthState(dir);
    const sock = makeWASocket({
      auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'}))},
      logger:pino({level:'silent'}),
      browser:Browsers.macOS('Chrome'),
      printQRInTerminal:false
    });
    sock.ev.on('creds.update',saveCreds);
    await delay(2000);
    const code = await sock.requestPairingCode(num);
    console.log('CODE:',code);
    res.json({code});
  }catch(e){
    console.log(e);
    res.json({error:'Failed: '+e.message});
  }
});

app.listen(PORT,'0.0.0.0',()=>console.log('WEB Running on '+PORT));