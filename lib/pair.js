import pino from 'pino';
import fs from 'fs';
import path from 'path';
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, Browsers, makeCacheableSignalKeyStore } from '@whiskeysockets/baileys';
import config from '../config.js';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

export async function pairNumber(number) {
  const num = String(number || '').replace(/[^0-9]/g, '');
  if (num.length < 11 || num.length > 15) {
    throw new Error('Sahi number likho (country code ke sath), e.g.: 923263695287');
  }

  const dir = path.join('./auth'); // <-- YAHAN FIX KIYA, pehle 'sessions' tha
  fs.mkdirSync(dir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();
  const logger = pino({ level: 'silent' });

  return new Promise(async (resolve, reject) => {
    let done = false;
    let requested = false;
    const deadline = Date.now() + 60 * 1000;

    const s = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      browser: Browsers.macOS('Chrome'),
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, logger) },
      markOnlineOnConnect: false,
      syncFullHistory: false,
    });

    s.ev.on('creds.update', saveCreds);

    s.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open' && !done) {
        done = true;
        console.log(`✅ ${config.botName} Link ho gaya!`);
        // SESSION_ID yahan generate hoga aur Render environment me SAVE hoga
        setTimeout(() => {
            try { s.end(undefined); } catch {}
        }, 1000);
      }
      if (connection === 'close' && !done && Date.now() < deadline) {
        const code = lastDisconnect?.error?.output?.statusCode;
        // Agar logged out ho to folder delete
        if (code === 401) { // loggedOut
            fs.rmSync(dir, { recursive: true, force: true });
        }
      }
    });

    if (!state.creds.registered && !requested) {
      requested = true;
      await sleep(2500);
      try {
        const c = await s.requestPairingCode(num);
        console.log(`Pair Code: ${c}`);
        resolve(c.match(/.{1,4}/g).join('-'));
      } catch (e) {
        reject(new Error('Code nahi ban saka: ' + e.message));
      }
    }

    // 60 sec baad auto delete agar connect na ho
    setTimeout(() => { 
      if (!done) {
        try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
      }
    }, 60000);
  });
}