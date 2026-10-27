import express from 'express';
import fs from 'fs';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, delay, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, DisconnectReason } from '@whiskeysockets/baileys';
import { config } from './config.js';

const app = express();
const PORT = config.port || 3000;

let pairCode = null;
let status = 'DISCONNECTED';
let sock = null;

export let settings;
let mod = null;

async function load(force = false) {
  if (!mod || force) {
    mod = await import('./commands.js' + (force ? '?v=' + Date.now() : ''));
    settings = mod.settings;
  }
  return mod;
}

export async function loadCommands() {
  try {
    const router = await load(true);
    console.log('COMMANDS LOADED:', router.totalCommands());
    return router.totalCommands();
  } catch (e) {
    console.log(e.message);
    return 0;
  }
}

export async function onMessage(s, upsert) {
  const router = await load();
  for (const m of upsert?.messages || []) {
    if (!m?.message) continue;
    const jid = m.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') continue;
    try { await router.handleMessage(s, m); } catch (e) { console.log(e.message); }
  }
}

app.get('/', (req, res) => {
  res.send(`<html><head><title>${config.botName}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#fff;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;font-family:sans-serif}.card{background:#111;border:2px solid #ff0040;border-radius:25px;padding:25px;width:360px;text-align:center;box-shadow:0 0 20px #ff0040}.dp{width:120px;height:120px;border-radius:50%;border:3px solid #ff0040;margin:auto;display:block}input{width:90%;padding:13px;border-radius:12px;background:#222;color:#fff;border:1px solid #ff0040;margin:12px 0;text-align:center}button{width:95%;padding:13px;border-radius:12px;background:#ff0040;color:#fff;font-weight:bold;border:none;cursor:pointer}.code{font-size:36px;color:#00ff88;background:#000;padding:16px;border-radius:12px;border:2px dashed #00ff88;margin:15px 0;letter-spacing:4px;font-weight:bold}</style></head><body><div class="card"><img class="dp" src="${config.botImage}"/><h1>🌹 ${config.botName} 🌹</h1><p>${config.ownerName}</p><p style="color:${status==='CONNECTED'?'#0f0':'#ff0040'}"><b>${status}</b></p>${status==='CONNECTED'?`<h2 style="color:#0f0">✅ FULL CONNECTED ✅</h2>`:`<form action="/pair"><input name="num" placeholder="92300XXXXXXXX" value="${config.ownerNumber}" required/><button>🔥 GET 8-LETTER CODE 🔥</button></form>${pairCode?`<div class="code">${pairCode}</div><p style="color:yellow;font-size:11px">WhatsApp > Linked Devices > Link with phone number</p>`:``}`} <br><a href="/clear"><button style="background:#333">CLEAR SESSION</button></a><p style="font-size:9px;color:#666;margin-top:10px">v${config.version} - CONNECTING EDITION</p></div></body></html>`);
});

app.get('/clear', async (req, res) => {
  try { if (sock) sock.end(); } catch {}
  if (fs.existsSync(config.authDir)) fs.rmSync(config.authDir, { recursive: true, force: true });
  status = 'DISCONNECTED'; pairCode = null; sock = null; mod = null;
  await delay(1500);
  startBot();
  res.redirect('/');
});

app.get('/pair', async (req, res) => {
  let num = (req.query.num || '').replace(/[^0-9]/g, '').trim();
  if (!num) return res.redirect('/');
  if (num.startsWith('0')) num = '92' + num.slice(1);
  console.log('PAIR REQUEST FOR:', num);
  try {
    if (fs.existsSync(config.authDir)) fs.rmSync(config.authDir, { recursive: true, force: true });
    fs.mkdirSync(config.authDir, { recursive: true });
    await delay(1000);
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
      browser: [config.botName, 'Chrome', '1.0'],
      markOnlineOnConnect: false,
      syncFullHistory: false
    });
    sock.ev.on('creds.update', saveCreds);
    await delay(4000);
    if (!sock.authState.creds.registered) {
      let code = await sock.requestPairingCode(num);
      pairCode = code.slice(0, 4) + '-' + code.slice(4);
      console.log(`PAIR CODE: ${pairCode} FOR ${num}`);
      setTimeout(() => { pairCode = null; }, 120000);
    }
    sock.ev.on('connection.update', (u) => {
      if (u.connection === 'open') {
        status = 'CONNECTED';
        pairCode = null;
        console.log('PAIRED SUCCESS - STARTING BOT');
        setTimeout(() => startBot(), 2000);
      }
    });
  } catch (e) {
    console.log('PAIR ERROR FULL:', e);
    pairCode = 'RETRY-CLEAR';
  }
  res.redirect('/');
});

async function startBot() {
  try {
    if (!fs.existsSync(config.authDir)) fs.mkdirSync(config.authDir, { recursive: true });
    if (fs.readdirSync(config.authDir).length === 0) { status = 'DISCONNECTED'; return; }
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })) },
      browser: [config.botName, 'Chrome', '1.0'],
      markOnlineOnConnect: true
    });
    sock.ev.on('creds.update', saveCreds);
    await loadCommands();
    sock.ev.on('messages.upsert', (upsert) => onMessage(sock, upsert));
    sock.ev.on('connection.update', (u) => {
      if (u.connection === 'open') { status = 'CONNECTED'; console.log(`${config.botName} ONLINE - WORKING`); }
      if (u.connection === 'close') {
        let r = u.lastDisconnect?.error?.output?.statusCode;
        status = 'DISCONNECTED';
        if (r !== DisconnectReason.loggedOut) setTimeout(startBot, 4000);
      }
    });
  } catch (e) { console.log(e.message); }
}

startBot();
app.listen(PORT, () => console.log(`RANA FURQAN MD RUNNING ON ${PORT} - CONNECTING EDITION`));