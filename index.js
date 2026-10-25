import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import express from 'express'
import pino from 'pino'

const app = express()
const PORT = process.env.PORT || 10000
let sock

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'fatal' }))
    },
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['Shadow-MD', 'Chrome', '1.0.0']
  })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update
    if (connection === 'open') {
      console.log('CONNECTED SUCCESSFULLY!')
      try {
        await sock.sendMessage(sock.user.id, { text: '✅ SHADOW-MD CONNECTED! Bot Online!' })
      } catch {}
    }
    if (connection === 'close') {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) {
        startBot()
      }
    }
  })
}

app.get('/', (req, res) => {
  res.send(`
    <center>
    <h2>SHADOW-MD PAIR</h2>
    <input id="n" placeholder="923003719761" style="padding:12px;width:220px">
    <button onclick="go()" style="padding:12px">Get 8 Letter Code</button>
    <h1 id="c" style="color:green;letter-spacing:5px"></h1>
    <p id="s"></p>
    <script>
      async function go(){
        const num=document.getElementById('n').value
        document.getElementById('s').innerText='Wait...'
        const r=await fetch('/pair?number='+num)
        const j=await r.json()
        if(j.code){document.getElementById('c').innerText=j.code;document.getElementById('s').innerText='Code mil gaya! WhatsApp me dalo - Link with phone number'}
        else document.getElementById('s').innerText=j.error
      }
    </script>
    </center>
  `)
})

app.get('/pair', async (req, res) => {
  let num = (req.query.number || '').replace(/[^0-9]/g, '')
  if (!num) return res.json({ error: 'Number do' })
  try {
    if (!sock) {
      await startBot()
      await new Promise(r => setTimeout(r, 3000))
    }
    let code = await sock.requestPairingCode(num)
    console.log('CODE', code, 'FOR', num)
    res.json({ code })
  } catch (e) {
    console.error(e)
    res.json({ error: e.message })
  }
})

app.listen(PORT, () => {
  console.log('Bot Ready on ' + PORT)
  startBot()
})