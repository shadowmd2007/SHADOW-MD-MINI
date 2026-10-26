// SHADOW-MD-MINI - index.js (FIXED + AUTO REACT)
import * as baileysNs from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import express from 'express'
import pino from 'pino'
import fs from 'fs'
import { onMessage, loadCommands } from './handler.js'

// Baileys ke alag alag versions alag tareeqe se export karte hain, isliye dono handle kiye
const B = baileysNs.useMultiFileAuthState ? baileysNs : (baileysNs.default ?? baileysNs)
const makeWASocket =
  typeof baileysNs.default === 'function' ? baileysNs.default
  : typeof B.default === 'function' ? B.default
  : B.makeWASocket ?? baileysNs.makeWASocket
const {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = B
const fetchLatestWaWebVersion =
  B.fetchLatestWaWebVersion ?? baileysNs.fetchLatestWaWebVersion ?? baileysNs.default?.fetchLatestWaWebVersion

const PORT = process.env.PORT || 10000
const AUTH_DIR = process.env.AUTH_DIR || 'auth'
const logger = pino({ level: process.env.LOG_LEVEL || 'silent' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

let sock = null
let generation = 0
let pairingBusy = false
let lastPairAt = 0
let authRegistered = false
let reconnectTimer = null
const status = { connection: 'idle', paired: false, closeCode: null, number: null }

const wipeAuth = () => {
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }) } catch {}
}

const isPaired = (creds) =>
  !!(creds?.registered || (creds?.me?.id && creds.me.name !== '~'))

let versionCache = null
async function getWaVersion() {
  const env = String(process.env.WA_VERSION || '').split(',').map((x) => parseInt(x, 10))
  if (env.length === 3 && env.every(Number.isFinite)) return env
  if (versionCache && Date.now() - versionCache.t < 10 * 60 * 1000) return versionCache.v
  let v
  try {
    const r = await fetchLatestWaWebVersion?.({})
    if (r?.version && r.isLatest !== false) v = r.version
  } catch {}
  if (!v) {
    try { ;({ version: v } = await fetchLatestBaileysVersion()) } catch {}
  }
  if (v) versionCache = { v, t: Date.now() }
  console.log('WA version:', v ? v.join('.') : 'library default (purana ho sakta hai)')
  return v
}

async function createSocket() {
  const myGen = ++generation
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)
  authRegistered = !!state.creds?.registered
  if (authRegistered) status.paired = true

  const version = await getWaVersion()

  const s = makeWASocket({
    ...(version ? { version } : {}),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    syncFullHistory: false,
    markOnlineOnConnect: false
  })
  sock = s

  s.ev.on('creds.update', async () => {
    if (myGen !== generation) return
    try { await saveCreds() } catch (e) { console.error('save creds error:', e.message) }
    if (state.creds?.registered) status.paired = true
  })

  s.ev.on('messages.upsert', async (upsert) => {
    if (myGen !== generation || upsert.type !== 'notify') return

    // --- AUTO REACT SYSTEM START 🌹 ---
    try {
      const dbPath = './data/autoreact.json';
      if (fs.existsSync(dbPath)) {
        const db = JSON.parse(fs.readFileSync(dbPath));
        if (db.enabled) {
          const msg = upsert.messages?.[0];
          if (msg?.key) {
            const emojis = ['❤️', '🌹', '💖', '🔥', '😍', '🥰', '💯', '✨', '😘'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            await s.sendMessage(msg.key.remoteJid, { react: { text: randomEmoji, key: msg.key } });
          }
        }
      }
    } catch (e) {}
    // --- AUTO REACT SYSTEM END 🌹 ---

    onMessage(s, upsert).catch((e) => console.log('handler error:', e.message))
  })

  s.ev.on('connection.update', (update) => onConnection(s, myGen, update))
  return s
}

function scheduleReconnect(ms) {
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    createSocket().catch((e) => {
      console.error('reconnect error:', e.message)
      scheduleReconnect(5000)
    })
  }, ms)
}

function onConnection(s, myGen, update) {
  if (myGen !== generation) return
  const { connection, lastDisconnect } = update

  if (connection) {
    status.connection = connection
    console.log('connection:', connection)
  }

  if (connection === 'open') {
    status.paired = true
    status.closeCode = null
    status.number = String(s.user?.id || '').split(':')[0].split('@')[0] || null
    console.log('CONNECTED SUCCESSFULLY!', status.number)
    const me = String(s.user?.id || '').replace(/:\d+@/, '@')
    if (me) {
      s.sendMessage(me, { text: '✅ RANA FURQAN MD CONNECTED! Bot Online!\n\nType .menu' }).catch(() => {})
    }
  }

  if (connection === 'close') {
    const code = new Boom(lastDisconnect?.error)?.output?.statusCode
    status.closeCode = code ?? 'unknown'
    console.log('Connection closed, code:', code)

    if (code === DisconnectReason.loggedOut) {
      wipeAuth()
      authRegistered = false
      sock = null
      status.paired = false
      status.connection = 'idle'
      console.log('Logged out - website se dobara pair karo')
      return
    }

    if (code === DisconnectReason.restartRequired) {
      scheduleReconnect(500)
      return
    }

    if (status.paired || isRegisteredAuth()) {
      status.paired = true
      scheduleReconnect(code === 408 || code === 428 ? 1500 : 3000)
    } else {
      status.connection = 'idle'
    }
  }
}

function isRegisteredAuth() {
  try {
    const raw = fs.readFileSync(`${AUTH_DIR}/creds.json`, 'utf8')
    return !!JSON.parse(raw)?.registered
  } catch { return false }
}

async function stopSocket() {
  clearTimeout(reconnectTimer)
  generation++
  const old = sock
  sock = null
  try { old?.end?.(undefined) } catch {}
  await sleep(600)
}

function waitReady(s, ms = 12000) {
  return new Promise((resolve, reject) => {
    const done = (fn, arg) => {
      clearTimeout(t)
      s.ev.off('connection.update', on)
      fn(arg)
    }
    const on = (u) => {
      if (u.qr) done(resolve)
      else if (u.connection === 'close') {
        const code = new Boom(u.lastDisconnect?.error)?.output?.statusCode
        const hint = code === 405 ? ' - WhatsApp ne version reject kiya' : code === 428 ? ' - connection beech mein band hua' : ''
        done(reject, new Error(`WhatsApp ne connection band kar diya (code ${code ?? '?'})${hint}`))
      }
    }
    const t = setTimeout(() => done(resolve), ms)
    s.ev.on('connection.update', on)
  })
}

function watchPairReject(s, ms = 3500) {
  return new Promise((resolve) => {
    const ws = s.ws
    if (!ws || typeof ws.on !== 'function') return resolve(null)
    let t
    const done = (v) => {
      clearTimeout(t)
      try { ws.off?.('CB:iq,type:error', on) } catch {}
      resolve(v)
    }
    const on = (node) => {
      const err = Array.isArray(node?.content) ? node.content.find((n) => n?.tag === 'error') : null
      done({ code: err?.attrs?.code || '?', text: err?.attrs?.text || 'error' })
    }
    t = setTimeout(() => done(null), ms)
    try { ws.on('CB:iq,type:error', on) } catch { done(null) }
  })
}

async function generatePairingCode(num) {
  await stopSocket()
  const s = await createSocket()
  await waitReady(s)
  await sleep(1200)

  const watch = watchPairReject(s)
  const raw = await s.requestPairingCode(num)
  const rej = await watch
  if (rej) {
    throw new Error(`WhatsApp ne pairing request reject ki (error ${rej.code} ${rej.text}). Kuch dair ruk kar dobara koshish karein.`)
  }
  return String(raw).match(/.{1,4}/g).join('-')
}

const app = express()

app.get('/status', (req, res) => res.json(status))
app.get('/health', (req, res) => res.send('ok'))

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>RANA FURQAN MD PAIR</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1116;color:#eef0f4;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:16px}
  .card{width:100%;max-width:400px;background:#171b22;border:1px solid #2a303a;border-radius:16px;padding:24px;text-align:center}
  h2{margin:0 0 6px} p{color:#9aa3b2;font-size:14px;line-height:1.5;margin:0 0 16px}
  input,button{width:100%;padding:13px;font-size:16px;border-radius:10px;border:1px solid #2a303a;background:#0e1116;color:#eef0f4}
  button{margin-top:10px;background:#128c7e;border:0;font-weight:600;cursor:pointer}
  button:disabled{opacity:.6}
  #c{font-size:34px;font-weight:800;letter-spacing:4px;color:#25d366;margin:18px 0 6px;word-break:break-all}
  #s{font-size:14px;color:#cbd2dc} #d{font-size:13px;color:#6b7280;margin-top:10px}
</style></head><body>
<div class="card">
  <img src="https://files.catbox.moe/y04tbj.jpg" alt="RANA FURQAN MD" style="width:100px;height:100px;object-fit:cover;border-radius:50%;margin-bottom:12px"><h2>RANA FURQAN MD</h2>
  <p>Apna number country code ke saath likho (+ ya 0 ke baghair).<br>Misal: 923001234567</p>
  <input id="n" type="tel" inputmode="numeric" placeholder="923001234567">
  <button id="b" onclick="go()">Get 8 Letter Code</button>
  <div id="c"></div>
  <div id="s"></div>
  <div id="d"></div>
</div>
<script>
  const $ = (id) => document.getElementById(id)
  let timer
  function poll() {
    clearInterval(timer)
    let n = 0
    timer = setInterval(async () => {
      n++
      try {
        const j = await (await fetch('/status')).json()
        $('d').innerText = 'Status: ' + j.connection + (j.closeCode ? ' | close code: ' + j.closeCode : '')
        if (j.connection === 'open') {
          $('c').innerText = '✅'
          $('s').innerText = 'Bot connect ho gaya! WhatsApp mein .menu likh kar check karo.'
          clearInterval(timer)
        }
      } catch (e) {}
      if (n > 90) clearInterval(timer)
    }, 2000)
  }
  async function go() {
    const num = $('n').value.replace(/[^0-9]/g, '')
    if (num.length < 8) { $('s').innerText = 'Number sahi likho'; return }
    $('b').disabled = true
    $('c').innerText = ''
    $('s').innerText = 'Code ban raha hai, 15-20 second wait karo...'
    try {
      const j = await (await fetch('/pair?number=' + num)).json()
      if (j.code) {
        $('c').innerText = j.code
        $('s').innerText = 'WhatsApp > Settings > Linked Devices > Link a device > "Link with phone number instead" mein yeh code daalo. Page band mat karo.'
        poll()
      } else {
        $('s').innerText = j.error || 'Error'
      }
    } catch (e) {
      $('s').innerText = 'Error: ' + e.message
    }
    $('b').disabled = false
  }
</script></body></html>`)
})

app.get('/pair', async (req, res) => {
  const num = String(req.query.number || '').replace(/[^0-9]/g, '')
  if (num.length < 8 || num.length > 15) {
    return res.json({ error: 'Number sahi likho: country code ke saath, + aur 0 ke baghair (923001234567)' })
  }
  if ((status.paired || authRegistered) && status.connection === 'open') {
    return res.json({ error: 'Bot pehle se connected hai. Dobara pair karne ke liye phone se Linked Devices mein is bot ko logout karo.' })
  }
  if (pairingBusy) return res.json({ error: 'Pehli request abhi chal rahi hai, thora wait karo' })
  const waitMs = 60_000 - (Date.now() - lastPairAt)
  if (waitMs > 0) return res.status(429).json({ error: `Pairing requests ke darmiyan ${Math.ceil(waitMs / 1000)} seconds wait karo. Baar-baar request se WhatsApp temporary limit laga sakta hai.` })

  pairingBusy = true
  lastPairAt = Date.now()
  try {
    const code = await generatePairingCode(num)
    res.json({ code })
  } catch (e) {
    console.error('pair error:', e.message)
    res.status(500).json({ error: e.message + ' - 10 second baad dobara try karo' })
  } finally {
    pairingBusy = false
  }
})

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e))
process.on('uncaughtException', (e) => console.error('uncaughtException:', e))

app.listen(PORT, '0.0.0.0', async () => {
  console.log('Bot Ready on ' + PORT)
  await loadCommands()
  try {
    const { state } = await useMultiFileAuthState(AUTH_DIR)
    if (isPaired(state.creds)) {
      console.log('Purana session mila, connect ho raha hai...')
      status.paired = true
      authRegistered = true
      await createSocket()
    } else {
      console.log('Koi session nahi. Website kholo aur number se pair karo.')
    }
  } catch (e) {
    console.error('boot error:', e)
  }
})