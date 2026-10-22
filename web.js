import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pino from 'pino';
import { default as makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
  <html><head><title>SHADOW-MD Pairing</title>
  <style>body{background:#0a0a0a;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh} .box{background:#1a1a1a;padding:30px;border-radius:15px;text-align:center;width:90%;max-width:400px} input{padding:12px;width:90%;margin:10px;border-radius:8px;border:none} button{padding:12px 25px;background:#25D366;border:none;border-radius:8px;cursor:pointer;color:white;font-weight:bold;width:90%} #code{margin-top:20px;font-size:28px;font-weight:bold;color:#25D366;letter-spacing:4px}</style>
  </head><body>
    <div class="box">
      <h2>SHADOW-MD MINI</h2>
      <p>COMMANDS: 77 Loaded</p>
      <p>Enter number with country code</p>
      <input id="num" placeholder="923003719761" />
      <br/><button onclick="pair()">Get Pair Code</button>
      <p id="code"></p>
      <p id="msg" style="font-size:12px;color:#aaa"></p>
    </div>
    <script>
      async function pair(){
        const num = document.getElementById('num').value;
        if(!num){ alert('Number likho'); return; }
        document.getElementById('code').innerText = 'Generating...';
        document.getElementById('msg').innerText = 'Wait 10-15 sec...';
        try{
          const res = await fetch('/pair?number='+num);
          const data = await res.json();
          if(data.code){
            document.getElementById('code').innerText = data.code;
            document.getElementById('msg').innerText = 'WhatsApp > Linked Devices > Link with phone number > Paste this code';
          } else {
            document.getElementById('code').innerText = data.error || 'Error';
          }
        }catch(e){ document.getElementById('code').innerText = 'Server Error, Retry'; }
      }
    </script>
  </body></html>`);
});

app.get('/pair', async (req, res) => {
  let num = req.query.number;
  if (!num) return res.json({ error: 'Number missing' });
  num = num.replace(/[^0-9]/g, '');

  const sessionDir = path.join(__dirname, 'auth', 'temp_' + num);
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
      },
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Chrome'),
    });

    sock.ev.on('creds.update', saveCreds);

    await delay(3000);
    
    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(num);
      console.log(`[PAIR] Code for ${num}: ${code}`);
      res.json({ code: code });
      
      // 60 sec baad connection check karke auth ko main me move kar do
      setTimeout(async () => {
        try {
          if (fs.existsSync(path.join(sessionDir, 'creds.json'))) {
            const mainDir = path.join(__dirname, 'auth', 'main');
            if (!fs.existsSync(mainDir)) fs.mkdirSync(mainDir, { recursive: true });
            // copy temp to main
            fs.readdirSync(sessionDir).forEach(f => {
              fs.copyFileSync(path.join(sessionDir, f), path.join(mainDir, f));
            });
            console.log('[PAIR] Auth saved to main, bot will restart');
            // temp delete
            fs.rmSync(sessionDir, { recursive: true, force: true });
          }
        } catch(e){}
      }, 40000);

    } else {
      res.json({ error: 'Already Paired' });
    }
  } catch (err) {
    console.log('[PAIR] Error:', err.message);
    res.json({ error: 'Failed to get code, try again. ' + err.message });
    if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WEB] Pairing server running on port ${PORT}`);
});