import * as baileysNs from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import express from 'express'
import pino from 'pino'
import fs from 'fs'

// Baileys ke alag alag versions alag tareeqe se export karte hain, isliye dono tareeqe handle kiye
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

const app = express()
const PORT = process.env.PORT || 10000
const AUTH_DIR = process.env.AUTH_DIR || 'auth'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

let sock
let starting = false

async function startBot() {
  if (starting) return
  starting = true
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR)

    let version
    try {
      ;({ version } = await fetchLatestBaileysVersion())
    } catch {}

    sock = makeWASocket({
      ...(version ? { version } : {}),
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }))
      },
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome')
    })

    sock.ev.on('creds.update', saveCreds)

    sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection) console.log('connection:', connection)
      if (connection === 'open') {
        console.log('CONNECTED SUCCESSFULLY!')
        try {
          await sock.sendMessage(sock.user.id, {
            text: '✅ SHADOW-MD CONNECTED! Bot Online!'
          })
        } catch {}
      }

      if (connection === 'close') {
        const code = new Boom(lastDisconnect?.error)?.output?.statusCode
        console.log('Connection closed, code:', code)
        if (code === DisconnectReason.loggedOut) {
          // session khatam, purani auth hata do taake dobara pair ho sake
          fs.rmSync(AUTH_DIR, { recursive: true, force: true })
        }
        setTimeout(startBot, 3000)
      }
    })
  } catch (e) {
    console.error('startBot error:', e)
    setTimeout(startBot, 5000)
  } finally {
    starting = false
  }
}

async function resetSession() {
  try {
    sock?.ev.removeAllListeners('connection.update')
    sock?.ev.removeAllListeners('creds.update')
    sock?.end?.(undefined)
  } catch {}
  sock = null
  fs.rmSync(AUTH_DIR, { recursive: true, force: true })
  await startBot()
  await wait(3000)
}

app.get('/health', (req, res) => res.send('ok'))

app.get('/', (req, res) => {
  res.send(`
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <center>
      <h2>SHADOW-MD PAIR</h2>
      <input id="n" placeholder="923001234567" style="padding:12px;width:220px">
      <button onclick="go()" style="padding:12px">Get 8 Letter Code</button>
      <h1 id="c" style="color:green;letter-spacing:5px"></h1>
      <p id="s"></p>
      <script>
        async function go() {
          const num = document.getElementById('n').value
          document.getElementById('s').innerText = 'Wait...'
          try {
            const r = await fetch('/pair?number=' + num)
            const j = await r.json()
            if (j.code) {
              document.getElementById('c').innerText = j.code
              document.getElementById('s').innerText = 'WhatsApp > Linked Devices > Link with phone number'
            } else {
              document.getElementById('s').innerText = j.error || 'Error'
            }
          } catch (e) {
            document.getElementById('s').innerText = 'Error: ' + e.message
          }
        }
      </script>
    </center>
  `)
})

app.get('/pair', async (req, res) => {
  const num = String(req.query.number || '').replace(/[^0-9]/g, '')
  if (!num) return res.json({ error: 'Number do' })
  try {
    if (sock?.authState?.creds?.registered) {
      return res.json({ error: 'Bot pehle se connected hai' })
    }
    // har baar naya saaf session, taake purani adhoori koshish masla na kare
    await resetSession()
    const code = await sock.requestPairingCode(num)
    console.log('CODE', code, 'FOR', num)
    res.json({ code })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e.message })
  }
})

process.on('unhandledRejection', (e) => console.error('unhandledRejection:', e))
process.on('uncaughtException', (e) => console.error('uncaughtException:', e))

app.listen(PORT, '0.0.0.0', () => {
  console.log('Bot Ready on ' + PORT)
  startBot()
})
