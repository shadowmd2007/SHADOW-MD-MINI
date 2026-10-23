// SHADOW MD MINI - index.js (ESM)
// Connection + web pairing page. Commands stay in handler.js / commands.js.
import * as baileys from '@whiskeysockets/baileys';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';

// ---- Baileys exports (works for default / named export styles) ----
const B = (k) => baileys[k] ?? baileys.default?.[k];
const makeWASocket = typeof baileys.default === 'function' ? baileys.default : B('makeWASocket');
const useMultiFileAuthState = B('useMultiFileAuthState');
const DisconnectReason = B('DisconnectReason');
const fetchLatestBaileysVersion = B('fetchLatestBaileysVersion');
const makeCacheableSignalKeyStore = B('makeCacheableSignalKeyStore');
const Browsers = B('Browsers');
const jidNormalizedUser = B('jidNormalizedUser');

if (typeof makeWASocket !== 'function' || typeof useMultiFileAuthState !== 'function') {
  console.error('Baileys import failed. Use "@whiskeysockets/baileys": "6.7.18" in package.json');
  process.exit(1);
}

const PORT = process.env.PORT || 3000;
const AUTH_DIR = process.env.AUTH_DIR || path.join(process.cwd(), 'data', 'shadow-auth');
const BOT_NAME = 'Shadow MD Mini';
const logger = pino({ level: 'silent' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let sock = null;
let gen = 0;
let connected = false;
let qrSeen = false;
let lastPairAt = 0;
let handlerMod = null;

async function loadHandler() {
  try {
    handlerMod = await import('./handler.js');
  } catch (e) {
    console.log('handler.js not loaded:', e.message);
  }
}

function stopSocket() {
  gen++;
  connected = false;
  qrSeen = false;
  try { sock?.ev?.removeAllListeners(); } catch {}
  try { sock?.end?.(undefined); } catch {}
  sock = null;
}

async function start() {
  const myGen = ++gen;
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  let version;
  try { ({ version } = await fetchLatestBaileysVersion()); } catch {}

  const s = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    markOnlineOnConnect: false,
    syncFullHistory: false,
    keepAliveIntervalMs: 25000,
    connectTimeoutMs: 60000,
  });
  sock = s;
  connected = false;
  qrSeen = false;

  s.ev.on('creds.update', saveCreds);

  s.ev.on('connection.update', async (u) => {
    if (myGen !== gen) return;
    const { connection, lastDisconnect, qr } = u;
    if (qr) qrSeen = true; // socket is ready to accept a pairing request

    if (connection === 'open') {
      connected = true;
      console.log('Connected to WhatsApp');
      try {
        const me = jidNormalizedUser(s.user.id);
        const msg = `✅ *${BOT_NAME}* connected successfully!\n\nType .menu to see all commands.`;
        if (typeof handlerMod?.sendPic === 'function') await handlerMod.sendPic(s, me, msg);
        else await s.sendMessage(me, { text: msg });
      } catch (e) { console.log('welcome msg failed:', e.message); }
    }

    if (connection === 'close') {
      connected = false;
      const code = lastDisconnect?.error?.output?.statusCode;
      console.log('Connection closed, code:', code);

      if (code === DisconnectReason.loggedOut) {
        // Logged out from phone: wipe session, wait for a new pairing
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        return;
      }
      const registered = !!s.authState?.creds?.registered;
      const needsRestart = code === DisconnectReason.restartRequired; // normal right after pairing
      if (!registered && !needsRestart) return; // not paired yet: wait for user to request a new code

      await sleep(needsRestart ? 500 : 3000);
      if (myGen === gen) start().catch((e) => console.log('restart failed:', e.message));
    }
  });

  s.ev.on('messages.upsert', async ({ messages, type }) => {
    if (myGen !== gen || type !== 'notify') return;
    const fn = handlerMod?.default ?? handlerMod?.handleMessage;
    if (typeof fn !== 'function') return;
    for (const m of messages) {
      if (!m.message) continue;
      try { await fn(s, m); } catch (e) { console.log('handler error:', e.message); }
    }
  });
}

async function createPairingCode(number) {
  if (connected) throw new Error('Bot is already connected.');
  const wait = 20000 - (Date.now() - lastPairAt);
  if (wait > 0) throw new Error(`Please wait ${Math.ceil(wait / 1000)}s before requesting again.`);
  lastPairAt = Date.now();

  // Always pair on a clean, fresh session
  stopSocket();
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
  await start();

  for (let i = 0; i < 60 && !qrSeen; i++) await sleep(250); // wait up to 15s
  if (!qrSeen) throw new Error('WhatsApp is not ready. Try again in a few seconds.');
  await sleep(1500);

  const raw = await sock.requestPairingCode(number);
  return raw.match(/.{1,4}/g).join('-');
}

// ---------------- Web page ----------------
const PAGE = `<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SHADOW MD</title><style>
body{margin:0;background:#f4f4f4;font-family:Roboto,Arial,sans-serif;color:#111}
.card{max-width:560px;margin:24px auto;background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 10px #0001}
h1{font-size:44px;margin:10px 0 24px}
input{width:100%;box-sizing:border-box;font-size:22px;padding:16px;border:3px solid #25d366;border-radius:12px}
small{display:block;margin:12px 0 18px;color:#333}
button{width:100%;font-size:22px;font-weight:700;color:#fff;background:#25d366;border:0;border-radius:12px;padding:16px}
button:disabled{opacity:.6}
#out{margin-top:20px;text-align:center}
#code{font-size:40px;font-weight:800;letter-spacing:4px;margin:10px 0}
#copy{background:#111;font-size:18px;padding:12px;margin-top:8px}
#msg{margin-top:14px}.err{color:#c00}.ok{color:#0a7a30}
</style></head><body><div class="card">
<h1>SHADOW MD</h1>
<p>Link your WhatsApp with a pairing code</p>
<p>WhatsApp number (with country code)</p>
<input id="num" type="tel" inputmode="numeric" placeholder="923001234567">
<small>Digits only, No leading 0. Example: 923001234567</small>
<button id="go">Get pairing code</button>
<div id="out" hidden><div id="code"></div><div id="timer"></div><button id="copy">Copy code</button></div>
<div id="msg"></div>
<ol><li>Enter number and tap Get pairing code.</li>
<li>On phone open WhatsApp → Settings → Linked devices.</li>
<li>Tap Link a device, then Link with phone number instead.</li>
<li>Type the code shown here (or tap the notification).</li></ol>
</div><script>
const $=id=>document.getElementById(id);let tm,poll;
$('go').onclick=async()=>{
  const number=$('num').value.replace(/\\D/g,'');
  $('msg').textContent='';$('msg').className='';$('out').hidden=true;
  if(number.length<8||number.startsWith('0')){$('msg').textContent='Enter number with country code, no leading 0.';$('msg').className='err';return}
  $('go').disabled=true;$('go').textContent='Please wait...';
  try{
    const r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({number})});
    const d=await r.json();
    if(!r.ok)throw new Error(d.error||'Failed');
    $('code').textContent=d.code;$('out').hidden=false;
    let left=60;clearInterval(tm);$('timer').textContent='Valid for 60s';
    tm=setInterval(()=>{left--;$('timer').textContent=left>0?'Valid for '+left+'s':'Expired, request a new code';if(left<=0)clearInterval(tm)},1000);
    clearInterval(poll);poll=setInterval(async()=>{
      try{const s=await (await fetch('/api/status')).json();
      if(s.connected){clearInterval(poll);clearInterval(tm);$('msg').textContent='Connected successfully!';$('msg').className='ok'}}catch{}
    },3000);
  }catch(e){$('msg').textContent='Error: '+e.message;$('msg').className='err'}
  $('go').disabled=false;$('go').textContent='Get pairing code';
};
$('copy').onclick=async()=>{
  const t=$('code').textContent.replace(/-/g,'');
  try{await navigator.clipboard.writeText(t)}catch{const i=document.createElement('input');i.value=t;document.body.appendChild(i);i.select();document.execCommand('copy');i.remove()}
  $('copy').textContent='Copied!';setTimeout(()=>$('copy').textContent='Copy code',1500);
};
</script></body></html>`;

const json = (res, status, obj) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/health') return json(res, 200, { ok: true });
    if (url.pathname === '/api/status') return json(res, 200, { connected });
    if (url.pathname === '/api/pair' && req.method === 'POST') {
      let body = '';
      for await (const c of req) body += c;
      const number = String(JSON.parse(body || '{}').number || '').replace(/\D/g, '');
      if (number.length < 8 || number.length > 15 || number.startsWith('0')) {
        return json(res, 400, { error: 'Invalid number. Use country code, no leading 0.' });
      }
      try {
        const code = await createPairingCode(number);
        return json(res, 200, { code });
      } catch (e) {
        return json(res, 400, { error: e.message });
      }
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(PAGE);
  } catch (e) {
    json(res, 500, { error: e.message });
  }
}).listen(PORT, () => console.log('Web server on port', PORT));

// Keep Render awake
if (process.env.RENDER_EXTERNAL_URL) {
  setInterval(() => fetch(process.env.RENDER_EXTERNAL_URL + '/health').catch(() => {}), 4 * 60 * 1000);
}

// ---------------- Boot ----------------
await loadHandler();
// If a saved session exists, reconnect automatically
if (fs.existsSync(path.join(AUTH_DIR, 'creds.json'))) {
  start().catch((e) => console.log('start failed:', e.message));
}
process.on('unhandledRejection', (e) => console.log('unhandledRejection:', e?.message || e));
process.on('uncaughtException', (e) => console.log('uncaughtException:', e?.message || e));
