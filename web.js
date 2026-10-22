import express from 'express';
import path from 'path';
import fs from 'fs';
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

// TUMHARI PIC EMBEDDED - Koi link ki zarurat nahi
const MY_PIC = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAGQAlgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq6+zt7u/wAARCACQAQIDASIAAhEBAxEB/8QAVQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdAB//2Q==";

app.get('/', (req,res)=>{
  const html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHADOW-MD MINI</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}.box{background:#1c1c1e;width:100%;max-width:430px;padding:30px 25px;border-radius:22px;text-align:center;border:1px solid #2a2a2a}.logo{width:130px;height:130px;border-radius:50%;border:3px solid #25D366;object-fit:cover;margin-bottom:15px}h2{font-size:27px} .cmd{color:#25D366;font-weight:bold;margin:10px 0 20px}input{width:100%;padding:16px;margin:20px 0 15px;border-radius:12px;border:none;font-size:18px;text-align:center}button{width:100%;padding:16px;background:#25D366;border:none;border-radius:12px;color:#fff;font-size:18px;font-weight:bold}#code{margin-top:22px;font-size:34px;font-weight:bold;color:#25D366;letter-spacing:4px}#msg{font-size:12px;color:#888;margin-top:10px}</style></head><body><div class="box"><img class="logo" src="' + MY_PIC + '" /><h2>SHADOW-MD MINI</h2><p class="cmd">COMMANDS: 77 Loaded</p><p style="color:#aaa;font-size:14px">Enter number with country code</p><input id="num" type="number" value="923003719761" /><button onclick="pair()">Get Pair Code</button><div id="code"></div><div id="msg">WhatsApp > Linked Devices > Link with phone number</div></div><script>async function pair(){const n=document.getElementById("num").value;document.getElementById("code").innerText="Generating...";const r=await fetch("/pair?number="+n);const d=await r.json();document.getElementById("code").innerText=d.code||d.error;document.getElementById("msg").innerText=d.code?"Ab 20 sec me WhatsApp me lagao!":"Retry";}</script></body></html>';
  res.send(html);
});

app.get('/pair', async (req,res)=>{
  let num = (req.query.number || '').replace(/[^0-9]/g,'');
  if(!num) return res.json({error:'Number missing'});
  if(activeSockets[num]){ try{activeSockets[num].end();}catch{} delete activeSockets[num]; }
  const tempDir = path.join(__dirname,'auth','temp_'+num);
  if(fs.existsSync(tempDir)) fs.rmSync(tempDir,{recursive:true,force:true});
  fs.mkdirSync(tempDir,{recursive:true});
  try{
    const {state,saveCreds} = await useMultiFileAuthState(tempDir);
    const sock = makeWASocket({
      auth:{creds:state.creds,keys:makeCacheableSignalKeyStore(state.keys,pino({level:'silent'}))},
      logger:pino({level:'silent'}),
      browser:Browsers.macOS('Chrome'),
      printQRInTerminal:false
    });
    activeSockets[num]=sock;
    sock.ev.on('creds.update',saveCreds);
    sock.ev.on('connection.update', async (u)=>{
      if(u.connection==='open'){
        console.log('PAIRED SUCCESS:',num);
        const mainDir=path.join(__dirname,'auth','main');
        if(!fs.existsSync(mainDir)) fs.mkdirSync(mainDir,{recursive:true});
        fs.readdirSync(tempDir).forEach(f=>{ fs.copyFileSync(path.join(tempDir,f), path.join(mainDir,f)); });
        console.log('Auth copied to main, restarting...');
        setTimeout(()=>process.exit(0),2000);
      }
    });
    // 2 sec wait for socket ready
    await new Promise(r=>setTimeout(r,2500));
    if(sock.authState.creds.registered) return res.json({error:'Already paired'});
    const code = await sock.requestPairingCode(num);
    console.log('CODE FOR',num,':',code);
    // 90 sec tak zinda rakho taake WhatsApp verify kar sake
    setTimeout(()=>{ try{sock.end();}catch{} delete activeSockets[num]; }, 90000);
    res.json({code});
  }catch(e){
    console.log('PAIR ERROR:',e);
    res.json({error:e.message});
  }
});

app.listen(PORT,'0.0.0.0',()=>console.log('WEB Running on '+PORT));