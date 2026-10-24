import fs from 'fs';
import path from 'path';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason, Browsers } from '@whiskeysockets/baileys';
import config from '../config.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Number ko link karne ka code banata hai. Link hone ke baad usi number ko SESSION_ID bhej deta hai.
export async function pairNumber(number) {
  const n = String(number || '').replace(/\D/g, '');
  if (n.length < 8 || n.length > 15) throw new Error('Sahi number likho (country code ke sath), e.g. 923001234567');
  const dir = path.join('sessions', n);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });

  const deadline = Date.now() + 3 * 60 * 1000;
  let done = false, requested = false, resolveCode, rejectCode;
  const codeP = new Promise((res, rej) => { resolveCode = res; rejectCode = rej; });

  async function connect() {
    const { state, saveCreds } = await useMultiFileAuthState(dir);
    const { version } = await fetchLatestBaileysVersion();
    const s = makeWASocket({
      version, auth: state, logger: pino({ level: 'silent' }),
      printQRInTerminal: false, browser: Browsers.ubuntu('Chrome'), markOnlineOnConnect: false,
    });
    s.ev.on('creds.update', saveCreds);
    s.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
      if (connection === 'open') {
        done = true;
        await sleep(3000);
        try {
          const sid = Buffer.from(fs.readFileSync(path.join(dir, 'creds.json'))).toString('base64');
          const me = n + '@s.whatsapp.net';
          await s.sendMessage(me, { text: `✅ *${config.botName}* link ho gaya!\n\nNeeche SESSION_ID hai. Isay Render ke Environment mein SESSION_ID naam se paste karo. Kisi ko share mat karna.` });
          await s.sendMessage(me, { text: sid });
        } catch (e) { console.error('pair send error:', e.message); }
        await sleep(4000);
        try { s.end(undefined); } catch {}
        setTimeout(() => fs.rmSync(dir, { recursive: true, force: true }), 5000);
      }
      if (connection === 'close' && !done) {
        const code = lastDisconnect?.error?.output?.statusCode;
        if (code !== DisconnectReason.loggedOut && Date.now() < deadline) connect().catch(() => {});
      }
    });
    if (!state.creds.registered && !requested) {
      requested = true;
      await sleep(2500);
      try { const c = await s.requestPairingCode(n); resolveCode(c.match(/.{1,4}/g).join('-')); }
      catch (e) { rejectCode(new Error('Code nahi ban saka: ' + e.message)); }
    }
  }

  await connect();
  setTimeout(() => { if (!done) fs.rmSync(dir, { recursive: true, force: true }); }, deadline - Date.now());
  return codeP;
}
