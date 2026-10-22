import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
  res.send(`
  <html>
  <head><title>SHADOW-MD Pairing</title>
  <style>body{background:#0a0a0a;color:white;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh} .box{background:#1a1a1a;padding:30px;border-radius:15px;text-align:center} input{padding:10px;width:250px;margin:10px} button{padding:10px 20px;background:#25D366;border:none;border-radius:5px;cursor:pointer;color:white;font-weight:bold}</style>
  </head>
  <body>
    <div class="box">
      <h2>SHADOW-MD MINI</h2>
      <p>COMMANDS: 77 Loaded</p>
      <p>Enter your WhatsApp number with country code</p>
      <input id="num" placeholder="923xxxxxxxxx" />
      <br/>
      <button onclick="pair()">Get Pair Code</button>
      <p id="code" style="margin-top:15px;font-size:20px;font-weight:bold;color:#25D366"></p>
    </div>
    <script>
      async function pair(){
        const num = document.getElementById('num').value;
        document.getElementById('code').innerText = 'Generating...';
        const res = await fetch('/pair?number='+num);
        const data = await res.json();
        document.getElementById('code').innerText = data.code || data.error || 'Error';
      }
    </script>
  </body>
  </html>
  `);
});

// Agar tumhari purani pairing logic hai to yahan import karo
// import { pairingRoute } from './lib/pair.js' etc.

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[WEB] Pairing server running on port ${PORT}`);
  console.log(`[SHADOW-MD] Ready - COMMANDS: 77`);
});