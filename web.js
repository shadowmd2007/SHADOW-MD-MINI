import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pino from 'pino';

// ✅ YE LINE FIX KI HAI - is se error khatam hoga
import makeWASocket, { useMultiFileAuthState, Browsers, makeCacheableSignalKeyStore, delay } from '@whiskeysockets/baileys';

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
      <h2>SHADOW-MD MINI</h2><p>COMMANDS: 77 Loaded</p><p>Enter number with country code</p>
      <input id="num" placeholder="923003719761" /><br/>
      <button onclick="pair()">Get Pair Code</button>
      <p id="code"></p><p id="msg" style="font-size:12px;color:#aaa"></p>
    </div>
    <script>
      async function pair(){
        const num = document.getElementById('num').value;
        document.getElementById('code').innerText = 'Generating...';
        document.getElementById('msg').innerText = 'Wait 10 sec...';
        const res = await fetch('/pair?number='+num);
        const data = await res.json();
        if(data.code){
          document.getElementById('code').innerText = data.code;
          document.getElementById('msg').innerText = 'WhatsApp > Linked Devices > Link with phone number';
        } else {
          document.getElementById('code').innerText = data.error || 'Error';
        }
      }
    </script></body></html>`);
});

app.get('/pair', async (req, res) => {
  let num = req.query.number?.replace(/[^0-9]/g, '');
  if (!num) return res.json({ error: 'Number missing' });

  const sessionDir = path.join(__dirname, 'auth', 'temp_' + num);
  if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
  fs.mkdirSync(sessionDir, { recursive: true });

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Chrome'),
      printQRInTerminal: false
    });

    sock.ev.on('creds.update', saveCreds);
    await delay(3000);

    if (!sock.authState.creds.registered) {
      const code = await sock.requestPairingCode(num);
      console.log(`[PAIR] Code ${num}: ${code}`);
      return res.json({ code });
    } else {
      return res.json({ error: 'Already Paired' });
    }
  } catch (err) {
    console.log(err);
    return res.json({ error: 'Failed: ' + err.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WEB] Running on ${PORT}`);
});