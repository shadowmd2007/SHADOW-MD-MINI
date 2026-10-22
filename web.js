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

// Tumhara Original Link - Isi se pic ayegi, no changing
const IBB_PAGE_LINK = "https://ibb.co/j9hXMSJH";

async function getDirectImageFromIBB() {
  try {
    const res = await fetch(IBB_PAGE_LINK, { headers: { "User-Agent": "Mozilla/5.0" } });
    const html = await res.text();
    // og:image se direct link nikalo
    let match = html.match(/property="og:image" content="([^"]+)"/) || html.match(/meta content="([^"]+)" property="og:image"/);
    if (match && match[1]) {
      console.log("DIRECT PIC FOUND:", match[1]);
      return match[1];
    }
    // backup: twitter image
    match = html.match(/name="twitter:image" content="([^"]+)"/);
    if (match) return match[1];
  } catch (e) {
    console.log("IBB fetch error:", e.message);
  }
  // fallback agar fetch fail ho to direct i.ibb.co try
  return "https://i.ibb.co/j9hXMSJH/IMG-20250513-WA0000.jpg";
}

app.get('/', async (req, res) => {
  const directPic = await getDirectImageFromIBB();
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SHADOW-MD MINI</title><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;color:#fff;font-family:Arial;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:20px}.box{background:#1c1c1e;width:100%;max-width:430px;padding:30px 25px;border-radius:22px;text-align:center;border:1px solid #2a2a2a}.logo{width:130px;height:130px;border-radius:50%;border:3px solid #25D366;object-fit:cover;margin-bottom:15px}h2{font-size:27px}.cmd{color:#25D366;font-weight:bold;margin:10px 0 20px}input{width:100%;padding:16px;margin:20px 0 15px;border-radius:12px;border:none;font-size:18px;text-align:center}button{width:100%;padding:16px;background:#25D366;border:none;border-radius:12px;color:#fff;font-size:18px;font-weight:bold}#code{margin-top:22px;font-size:34px;font-weight:bold;color:#25D366;letter-spacing:4px}#msg{font-size:12px;color:#888;margin-top:10px}</style></head><body><div class="box"><img class="logo" src="${directPic}" onerror="this.src='https://i.ibb.co/j9hXMSJH/IMG-20250513-WA0000.jpg'" /><h2>SHADOW-MD MINI</h2><p class="cmd">COMMANDS: 77 Loaded</p><p style="color:#aaa;font-size:14px">Enter number with country code</p><input id="num" type="number" value="923263695287" /><button onclick="pair()">Get Pair Code</button><div id="code"></div><div id="msg">WhatsApp > Linked Devices > Link with phone number</div></div><script>async function pair(){const n=document.getElementById("num").value;const codeEl=document.getElementById("code");const msgEl=document.getElementById("msg");codeEl.innerText="Generating...";try{const r=await fetch("/pair?number="+n);const d=await r.json();if(d.code){codeEl.innerText=d.code;msgEl.innerHTML="Code mil gaya!<br><b style='color:#25D366'>Ab WhatsApp kholo > Linked Devices > Link with phone number > Ye code lagao</b><br>WhatsApp par notification aa gaya hoga!"; // Browser Notification if("Notification" in window){if(Notification.permission!=="granted")await Notification.requestPermission();if(Notification.permission==="granted"){new Notification("SHADOW-MD Pair Code",{body:"Code: "+d.code+" - WhatsApp me lagao!",icon:"${directPic}"});}} // Vibration if(navigator.vibrate)navigator.vibrate(200); } else {codeEl.innerText=d.error;}}catch(e){codeEl.innerText="Server Error";}}</script></body></html>`;
  res.send(html);
});

app.get('/pair', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '');
  if (!num) return res.json({ error: 'Number missing' });
  if (activeSockets[num]) { try { activeSockets[num].end(); } catch {} delete activeSockets[num]; }
  const tempDir = path.join(__dirname, 'auth', 'temp_' + num);
  if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(tempDir, { recursive: true });
  try {
    const { state, saveCreds } = await useMultiFileAuthState(tempDir);
    const sock = makeWASocket({
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
      logger: pino({ level: 'silent' }),
      browser: Browsers.macOS('Chrome'),
      printQRInTerminal: false
    });
    activeSockets[num] = sock;
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (u) => {
      if (u.connection === 'open') {
        console.log('PAIRED SUCCESS - WHATSAPP NOTIFICATION SENT:', num);
        const mainDir = path.join(__dirname, 'auth', 'main');
        if (!fs.existsSync(mainDir)) fs.mkdirSync(mainDir, { recursive: true });
        fs.readdirSync(tempDir).forEach(f => { fs.copyFileSync(path.join(tempDir, f), path.join(mainDir, f)); });
        setTimeout(() => process.exit(0), 2000);
      }
    });
    await new Promise(r => setTimeout(r, 3000));
    if (sock.authState.creds.registered) return res.json({ error: 'Already paired' });
    // Ye line WhatsApp par pairing notification bhejti hai
    const code = await sock.requestPairingCode(num);
    console.log('PAIR CODE FOR', num, ':', code, '- WhatsApp ko notification chala gaya!');
    setTimeout(() => { try { sock.end(); } catch {} delete activeSockets[num]; }, 120000);
    res.json({ code });
  } catch (e) {
    console.log('PAIR ERROR:', e);
    res.json({ error: 'Failed: ' + e.message });
  }
});

app.listen(PORT, '0.0.0.0', () => console.log('WEB Running with IBB pic on ' + PORT));