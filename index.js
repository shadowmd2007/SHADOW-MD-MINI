
import * as baileysNs from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import express from 'express'
import pino from 'pino'
import fs from 'fs'
import path from 'path'
import { onMessage, loadCommands } from './handler.js'

const B = baileysNs.useMultiFileAuthState
  ? baileysNs
  : (baileysNs.default ?? baileysNs)

const makeWASocket =
  typeof baileysNs.default === 'function'
    ? baileysNs.default
    : typeof B.default === 'function'
      ? B.default
      : B.makeWASocket ?? baileysNs.makeWASocket

const {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  DisconnectReason,
  fetchLatestBaileysVersion,
  Browsers
} = B

const PORT = process.env.PORT || 10000

// Existing saved session ko dhoondo; warna persistent volume use karo.
const AUTH_CANDIDATES = [
  process.env.AUTH_DIR,
  'auth',
  '/app/data/shadow-auth'
].filter(Boolean)

const AUTH_DIR =
  AUTH_CANDIDATES.find(dir =>
    fs.existsSync(path.join(dir, 'creds.json'))
  ) || process.env.AUTH_DIR || '/app/data/shadow-auth'

console.log('Auth directory:', AUTH_DIR)

const logger = pino({ level: process.env.LOG_LEVEL || 'silent' })
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

let sock = null
let generation = 0
let pairingBusy = false
let lastPairAt = 0
let reconnectTimer = null

const status = {
  connection: 'idle',
  paired: false,
  closeCode: null,
  number: null
}

const wipeAuth = () => {
  try {
    fs.rmSync(AUTH_DIR, { recursive: true, force: true })
  } catch (e) {
    console.error('Auth cleanup error:', e.message)
  }
}

const isPaired = creds =>
  !!(creds?.registered || (creds?.me?.id && creds.me.name !== '~'))

async function createSocket() {
  const myGen = ++generation
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

  let version
  try {
    ({ version } = await fetchLatestBaileysVersion())
  } catch (e) {
    console.log('Version lookup failed; using library default.')
  }

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
    try {
      await saveCreds()
    } catch (e) {
      console.error('Saving credentials failed:', e.message)
    }
  })

  s.ev.on('messages.upsert', upsert => {
    if (myGen !== generation || upsert.type !== 'notify') return
    onMessage(s, upsert).catch(e =>
      console.error('Handler error:', e.message)
    )
  })

  s.ev.on('connection.update', update =>
    onConnection(s, myGen, update)
  )

  return s
}

function scheduleReconnect(ms) {
  clearTimeout(reconnectTimer)
  reconnectTimer = setTimeout(() => {
    createSocket().catch(e => {
      console.error('Reconnect error:', e.message)
      scheduleReconnect(5000)
    })
  }, ms)
}

function onConnection(s, myGen, update) {
  if (myGen !== generation) return

  const { connection, lastDisconnect } = update

  if (connection) {
    status.connection = connection
    console.log('Connection:', connection)
  }

  if (connection === 'open') {
    status.paired = true
    status.closeCode = null
    status.number =
      String(s.user?.id || '').split(':')[0].split('@')[0] || null

    console.log('CONNECTED SUCCESSFULLY!', status.number)

    const me = String(s.user?.id || '').replace(/:\d+@/, '@')
    if (me) {
      s.sendMessage(me, {
        text: '✅ SHADOW-MD CONNECTED! Bot Online!\n\nType .menu'
      }).catch(() => {})
    }
  }

  if (connection === 'close') {
    const code = new Boom(lastDisconnect?.error)?.output?.statusCode
    status.closeCode = code ?? 'unknown'
    console.log('Connection closed, code:', code)

    if (code === DisconnectReason.loggedOut) {
      wipeAuth()
      sock = null
      status.paired = false
      status.connection = 'idle'
      console.log('WhatsApp logged out; pairing is required.')
      return
    }

    if (code === DisconnectReason.restartRequired) {
      scheduleReconnect(500)
      return
    }

    if (status.paired) {
      scheduleReconnect(3000)
    } else {
      status.connection = 'idle'
    }
  }
}

async function stopSocket() {
  clearTimeout(reconnectTimer)
  generation++

  const old = sock
  sock = null

  try {
    old?.end?.(undefined)
  } catch {}

  await sleep(600)
}

function waitReady(s, ms = 12000) {
  return new Promise((resolve, reject) => {
    let settled = false

    const done = (fn, arg) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      s.ev.off('connection.update', on)
      fn(arg)
    }

    const on = update => {
      if (update.qr) done(resolve)
      else if (update.connection === 'close') {
        done(reject, new Error('Connection closed; try again later.'))
      }
    }

    const timer = setTimeout(() => done(resolve), ms)
    s.ev.on('connection.update', on)
  })
}

function watchPairReject(s, ms = 3500) {
  return new Promise(resolve => {
    const ws = s.ws
    if (!ws || typeof ws.on !== 'function') return resolve(null)

    let timer

    const done = value => {
      clearTimeout(timer)
      try {
        ws.off?.('CB:iq,type:error', on)
      } catch {}
      resolve(value)
    }

    const on = node => {
      const err = Array.isArray(node?.content)
        ? node.content.find(n => n?.tag === 'error')
        : null

      done(err
        ? {
            code: err.attrs?.code || '?',
            text: err.attrs?.text || 'error'
          }
        : null)
    }

    timer = setTimeout(() => done(null), ms)

    try {
      ws.on('CB:iq,type:error', on)
    } catch {
      done(null)
    }
  })
}

async function generatePairingCode(num) {
  let lastErr

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Do not delete saved credentials while requesting a pairing code.
      const s = await createSocket()
      await waitReady(s)
      await sleep(1500)

      const watch = watchPairReject(s)
      const raw = await s.requestPairingCode(num)
      const rejection = await watch

      if (rejection) {
        const err = new Error(
          `WhatsApp rejected pairing code: ${rejection.code} ${rejection.text}`
        )
        err.noRetry = true
        throw err
      }

      return String(raw).match(/.{1,4}/g).join('-')
    } catch (e) {
      if (e.noRetry) throw e
      lastErr = e
      console.error(`Pair attempt ${attempt} failed:`, e.message)
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
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SHADOW-MD PAIR</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e1116;color:#eef0f4;font-family:system-ui;padding:16px}
.card{width:100%;max-width:400px;background:#171b22;border:1px solid #2a303a;border-radius:16px;padding:24px;text-align:center}
p{color:#9aa3b2;font-size:14px;line-height:1.5}
input,button{width:100%;padding:13px;font-size:16px;border-radius:10px;border:1px solid #2a303a;background:#0e1116;color:#eef0f4}
button{margin-top:10px;background:#128c7e;border:0;font-weight:600}
#c{font-size:30px;font-weight:800;letter-spacing:4px;color:#25d366;margin:18px 0;word-break:break-all}
#s{font-size:14px}
</style>
</head>
<body>
<div class="card">
<h2>SHADOW-MD PAIR</h2>
<p>Number country code ke saath likho, + aur starting 0 ke baghair.<br>Example: 923001234567</p>
<input id="n" type="tel" inputmode="numeric" placeholder="923001234567">
<button id="b" onclick="go()">Get Pairing Code</button>
<div id="c"></div>
<div id="s"></div>
</div>
<script>
const $ = id => document.getElementById(id);
let timer;

function poll() {
  clearInterval(timer);
  let count = 0;
  timer = setInterval(async () => {
    count++;
    try {
      const j = await (await fetch('/status')).json();
      $('s').innerText = 'Status: ' + j.connection;
      if (j.connection === 'open') {
        $('c').innerText = '✅ CONNECTED';
        $('s').innerText = 'Bot online. WhatsApp mein .menu check karo.';
        clearInterval(timer);
      }
    } catch {}
    if (count > 90) clearInterval(timer);
  }, 2000);
}

async function go() {
  const num = $('n').value.replace(/[^0-9]/g, '');
  if (num.length < 8) {
    $('s').innerText = 'Number sahi likho.';
    return;
  }

  $('b').disabled = true;
  $('c').innerText = '';
  $('s').innerText = 'Please wait...';

  try {
    const response = await fetch('/pair?number=' + num);
    const j = await response.json();

    if (j.code) {
      $('c').innerText = j.code;
      $('s').innerText =
        'WhatsApp > Linked Devices > Link with phone number instead.';
      poll();
    } else {
      $('s').innerText = j.error || 'Pairing error';
    }
  } catch (e) {
    $('s').innerText = 'Error: ' + e.message;
  }

  $('b').disabled = false;
}
</script>
</body>
</html>`)
})

app.get('/pair', async (req, res) => {
  const num = String(req.query.number || '').replace(/[^0-9]/g, '')

  if (num.length < 8 || num.length > 15) {
    return res.json({
      error: 'Number country code ke saath likho, + aur starting 0 ke baghair.'
    })
  }

  if (status.paired) {
    return res.json({
      error: 'Existing session detected. Dobara pair na karein; pehle connection logs check karein.'
    })
  }

  if (pairingBusy) {
    return res.json({ error: 'Pairing request already running; wait a little.' })
  }

  if (Date.now() - lastPairAt < 8000) {
    return res.json({ error: 'Please wait 8 seconds before retrying.' })
  }

  pairingBusy = true
  lastPairAt = Date.now()

  try {
    const code = await generatePairingCode(num)
    console.log('Pairing code requested for:', num)
    res.json({ code })
  } catch (e) {
    console.error('Pairing error:', e.message)
    res.status(500).json({ error: e.message })
  } finally {
    pairingBusy = false
  }
})

process.on('unhandledRejection', e =>
  console.error('Unhandled rejection:', e)
)

process.on('uncaughtException', e =>
  console.error('Uncaught exception:', e)
)

app.listen(PORT, '0.0.0.0', async () => {
  console.log('Bot Ready on', PORT)
  console.log('Using auth directory:', AUTH_DIR)

  try {
    await loadCommands()

    const { state } = await useMultiFileAuthState(AUTH_DIR)

    if (isPaired(state.creds)) {
      console.log('Saved session found; connecting...')
      status.paired = true
      await createSocket()
    } else {
      console.log('No saved session found. Pairing page is ready.')
    }
  } catch (e) {
    console.error('Boot error:', e)
  }
})
