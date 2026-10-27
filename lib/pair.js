import makeWASocket, { useMultiFileAuthState, makeCacheableSignalKeyStore, delay } from '@whiskeysockets/baileys'
import pino from 'pino'
import fs from 'fs'

async function RANA_FURQAN_PAIR() {
  const { state, saveCreds } = await useMultiFileAuthState('./RANA-AUTH')

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
    },
    logger: pino({ level: 'silent' }),
    browser: ['RANA FURQAN MD', 'Chrome', '20.0.04'],
    printQRInTerminal: false
  })

  sock.ev.on('creds.update', saveCreds)

  await delay(3000)

  let num = '923003719761' // Apna number
  let code = await sock.requestPairingCode(num)

  console.log(`\n🌹 RANA FURQAN MD CODE: ${code.slice(0, 4)}-${code.slice(4)} 🌹\nWhatsApp me jaldi dalo!\n`)

  sock.ev.on('connection.update', async (u) => {
    if (u.connection === 'open') {
      console.log('\n✅ CONNECTED ✅\n')

      let creds = fs.readFileSync('./RANA-AUTH/creds.json', 'utf-8')
      let b64 = Buffer.from(creds).toString('base64')

      console.log('--- COPY THIS SESSION_ID ---\n')
      console.log(`RANA-FURQAN-MD~${b64}`)
      console.log('\n--- END ---\n')
      console.log('Isko Railway Variables me SESSION_ID me paste karo!')

      process.exit()
    }
  })
}

RANA_FURQAN_PAIR()