// SHADOW-MD-MINI - index.js (FIXED)
// Fix 1: pairing code ab tab maanga jata hai jab socket sach mein ready ho
// Fix 2: code ke baad socket restart nahi hota (warna code invalid ho jata tha)
// Fix 3: pair hone ke baad 515 restart sahi handle hota hai
// Fix 4: messages.upsert connect kiya - ab bot commands ka reply karta hai
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
let generation = 0 // har naye socket ka number, purane socket ke events ignore karne ke liye
let pairingBusy = false
let lastPairAt = 0
let reconnectTimer = null
const status = { connection: 'idle', paired: false, closeCode: null, number: null }

const wipeAuth = () => {
  try { fs.rmSync(AUTH_DIR, { recursive: true, force: true }) } catch {}
}

// creds mein asli pair hua account hai ya sirf adhoori pairing ka placeholder
const isPaired = (creds) =>
  !!(creds?.registered || (creds?.me?.id && creds.me.name !== '~'))

// WhatsApp purane version ko 405 se reject kar deta hai (QR/code banne se pehle hi connection band).
// Isliye version seedha WhatsApp Web se lete hain. Zaroorat ho to env WA_VERSION=2,3000,1234567890 se zabardasti set karo.
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

  s.ev.on('creds.update', () => {
    if (myGen === generation) saveCreds()
  })

  s.ev.on('messages.upsert', (upsert) => {
    if (myGen !== generation || upsert.type !== 'notify') return
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
  if (myGen !== generation) return // purana socket, ignore
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
      s.sendMessage(me, { text: '✅ SHADOW-MD CONNECTED! Bot Online!\n\nType .menu' }).catch(() => {})
    }
  }

  if (connection === 'close') {
    const code = new Boom(lastDisconnect?.error)?.output?.statusCode
    status.closeCode = code ?? 'unknown'
    console.log('Connection closed, code:', code)

    if (code === DisconnectReason.loggedOut) {
      // phone se logout hua, session khatam. Dobara pair karna hoga
      wipeAuth()
      sock = null
      status.paired = false
      status.connection = 'idle'
      console.log('Logged out - website se dobara pair karo')
      return
    }

    if (code === DisconnectReason.restartRequired) {
      // pairing poori hone ke baad WhatsApp khud restart maangta hai, yeh normal hai
      scheduleReconnect(500)
      return
    }

    if (status.paired) {
      scheduleReconnect(3000)
    } else {
      // abhi pair nahi hua, loop mein socket mat banao, user ka code kharab hoga
      status.connection = 'idle'
    }
  }
}

async function stopSocket() {
  clearTimeout(reconnectTimer)
  generation++ // purane socket ke saare events ab ignore honge
  const old = sock
  sock = null
  try { old?.end?.(undefined) } catch {}
  await sleep(600)
}

// socket ka handshake poora hone ka intezar (qr event aane ka matlab socket ready hai)
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

// requestPairingCode sirf request bhejta hai, WhatsApp ka jawab baad mein aata hai.
// Agar WhatsApp reject kar de (iq error) to jhoota code dikhane ke bajaye saaf error dikhao.
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
  let lastErr
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await stopSocket()
      // Preserve auth files unless WhatsApp explicitly reports loggedOut.
      const s = await createSocket()
      await waitReady(s)
      await sleep(1500)
      const watch = watchPairReject(s)
      const raw = await s.requestPairingCode(num)
      const rej = await watch
      if (rej) {
        const err = new Error(`WhatsApp ne pairing code reject kar diya (error ${rej.code} ${rej.text}). Ye aap ki galti nahi, July 2026 se Baileys ka known masla hai`)
        err.noRetry = true
        throw err
      }
      return String(raw).match(/.{1,4}/g).join('-')
    } catch (e) {
      if (e.noRetry) throw e
      lastErr = e
      console.log(`Pair attempt ${attempt} fail:`, e.message)
      await sleep(2500)
    }
  }
  throw lastErr
}

const app = express()

app.get('/status', (req, res) => res.json(status))
app.get('/health', (req, res) => res.send('ok'))

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SHADOW-MD PAIR</title>
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
  <h2>SHADOW-MD PAIR</h2>
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
  if (status.paired && status.connection === 'open') {
    return res.json({ error: 'Bot pehle se connected hai. Dobara pair karne ke liye phone se Linked Devices mein is bot ko logout karo.' })
  }
  if (pairingBusy) return res.json({ error: 'Pehli request abhi chal rahi hai, thora wait karo' })
  if (Date.now() - lastPairAt < 8000) return res.json({ error: '10 second baad dobara try karo' })

  pairingBusy = true
  lastPairAt = Date.now()
  try {
    const code = await generatePairingCode(num)
    console.log('CODE', code, 'FOR', num)
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
      await createSocket()
    } else {
      console.log('Koi session nahi. Website kholo aur number se pair karo.')
    }
  } catch (e) {
    console.error('boot error:', e)
  }
})