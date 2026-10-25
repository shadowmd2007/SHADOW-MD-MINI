import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, DisconnectReason } from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import express from 'express'
import pino from 'pino'

const app = express()
const PORT = process.env.PORT || 10000
let sock
let lastCode = null

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth')
  sock = makeWASocket({
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({ level: 'fatal' })) },
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ["SHADOW-MD", "Chrome", "1.0.0"]
  })
  sock.ev.on('creds.update', saveCreds)
  sock.ev.on('connection.update', async (u) => {
    const { connection, lastDisconnect } = u
    if(connection === 'open') {
      console.log('✅ FURQAN-MD CONNECTED SUCCESSFULLY!')
      lastCode = null
      // WhatsApp pe notification bhejo ke connect ho gaya
      try {
        await sock.sendMessage(sock.user.id, { text: `✅ *SHADOW-MD Connected!*\n\nBot Online Ho Gaya Hai! Ab .menu likho!` })
      } catch {}
    }
    if(connection === 'close') {
      const r = new Boom(lastDisconnect?.error)?.output?.statusCode
      if(r !== DisconnectReason.loggedOut) { console.log('Reconnecting...'); startBot() }
    }
  })
}

app.get('/', (req, res) => {
  res.send(`
    <center><h2>SHADOW-MD PAIR</h2>
    <input id="num" placeholder="923003719761" style="padding:12px;width:220px">
    <button onclick="getCode()" style="padding:12px">Get Code</button>
    <h1 id="code" style="letter-spacing:4px;color:green"></h1>
    <h3 id="status"></h3>
    <p>1. Number likho 2. Code lo 3. WhatsApp me Link with phone number pe dalo<br>4. 10 sec wait karo - Auto Connect ho jayega!</p>
    </center>
    <script>
      async function getCode(){
        const n=document.getElementById('num').value
        document.getElementById('status').innerText='Code generate ho raha hai...'
        const r=await fetch('/pair?number='+n)
        const d=await r.json()
        if(d.code){
          document.getElementById('code').innerText=d.code
          document.getElementById('status').innerText='✅ Code Mil Gaya! Ab WhatsApp me dalo, 10 sec me Connected ayega!'
          checkStatus()
        } else document.getElementById('status').innerText=d.error
      }
      async function checkStatus(){
        const r=await fetch('/status')
        const d=await r.json()
        if(d.connected){ document.getElementById('status').innerText='🎉 CONNECTED! WhatsApp pe notification aa gaya hoga!'; }
        else setTimeout(checkStatus, 3000)
      }
    </script>
  `)
})

app.get('/pair', async (req, res) => {
  const number = (req.query.number || '').replace(/[^0-9]/g,'')
  if(!number) return res.json({ error: 'Number dalo' })
  try {
    if(!sock) { await startBot(); await new Promise(r=>setTimeout(r, 2000)) }
    const code = await sock.requestPairingCode(number)
    lastCode = code
    console.log('CODE:', code, 'FOR', number)
    res.json({ code })
  } catch(e){ res.json({ error: e.message }) }
})

app.get('/status', (req, res) => {
  const connected = sock && sock.user ? true : false
  res.json({ connected, user: sock?.user?.id || null })
})

app.listen(PORT, () => { console.log('Bot Ready'); startBot() })