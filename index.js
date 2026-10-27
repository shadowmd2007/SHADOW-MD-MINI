try {
  const d = await import('dotenv');
  (d.default ?? d).config();
} catch {}

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pino from 'pino';
import { default as makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || config.port || 3000;

let status = 'DISCONNECTED';
let pairingData = { code: null, expiry: null, id: null };
let sock = null;

// 🌹 NEW - For public/index.html API
const apiAttempts = new Map();

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// 🌹 API ROUTES - Jo aapki DP wali site dhoondti hai
app.get('/api/info', (req,res)=>{
  res.json({
    botName: config.botName,
    ownerName: config.ownerName || 'RANA FURQAN',
    image: config.botImage,
    botImage: config.botImage,
    ok: true
  });
});

app.get('/health', (req,res)=> res.json({ok:true, status}));

app.post('/api/pair', async (req,res)=>{
  let num = (req.body?.number || '').toString().replace(/[^0-9]/g,'');
  if(!num) return res.status(400).json({error:'Number do!'});
  try{
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    const { version } = await fetchLatestBaileysVersion();
    const tempSock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Safari','Mac OS','15.0']
    });
    tempSock.ev.on('creds.update', saveCreds);
    if(!tempSock.authState.creds.registered){
      await delay(1500);
      let code = await tempSock.requestPairingCode(num);
      const id = Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      pairingData = { code, expiry: Date.now()+60000, id };
      apiAttempts.set(id, { code, number: num });
      console.log(`🌹 RANA FURQAN PAIR ${num} => ${code}`);
      setTimeout(()=>{ try{tempSock.end()}catch{}; pairingData.code=null; }, 60000);
      return res.json({ id, code, status:'ok' });
    }else{
      return res.status(400).json({error:'Already registered! Delete sessions folder'});
    }
  }catch(e){
    console.error('pair error', e.message);
    return res.status(500).json({error: 'Pair fail: '+e.message});
  }
});

app.get('/api/pair/:id', (req,res)=>{
  const a = apiAttempts.get(req.params.id);
  if(!a) return res.status(404).json({error:'ID not found'});
  return res.json({code: a.code});
});

// 🌹 Purana / wala page bhi rahega
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head><title>🌹 ${config.botName} 🌹</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#0f0f0f;border:2px solid #ff0000;border-radius:25px;padding:25px;width:360px;text-align:center;box-shadow:0 0 30px red}
.dp{width:110px;height:110px;border-radius:50%;border:3px solid red;margin:0 auto 12px;display:block;object-fit:cover;box-shadow:0 0 20px red}
h1{color:red;margin:5px 0;font-size:22px}
input{width:100%;padding:14px;border-radius:12px;border:none;margin:12px 0;text-align:center;font-size:17px;background:#222;color:#fff}
button{width:100%;padding:14px;border-radius:12px;border:none;background:red;color:#fff;font-weight:bold;font-size:16px;cursor:pointer}
.code{font-size:30px;letter-spacing:3px;color:#00ff00;background:#000;padding:12px;border-radius:12px;margin-top:15px;border:1px dashed #0f0}
</style></head>
<body>
<div class="card">
<img class="dp" src="${config.botImage}" />
<h1>🌹 ${config.botName} 🌹</h1>
<p style="font-size:12px;color:#aaa">OWNER: ${config.ownerNumber} | STATUS: ${status}</p>
${status === 'CONNECTED' ? '<h2 style="color:#0f0">✅ BOT CONNECTED 🌹</h2>' : `
<form method="GET" action="/getcode">
<input name="number" value="${config.ownerNumber}" placeholder="92300XXXXXXX" required />
<button type="submit">GET PAIR CODE</button>
</form>
${pairingData.code ? `<div class="code">${pairingData.code}</div><div style="color:yellow;font-size:12px;margin-top:8px">Valid 60s - ID: ${pairingData.id}</div>` : ''}
`}
<p style="margin-top:15px"><a href="/public/index.html" style="color:red">New Stylish Page</a></p>
</div>
</body>
</html>
`);
});

app.get('/getcode', async (req, res) => {
    let num = (req.query.number || '').replace(/[^0-9]/g, '');
    if(!num) return res.redirect('/');
    try {
        const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
        const { version } = await fetchLatestBaileysVersion();
        const tempSock = makeWASocket({
            version,
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
            printQRInTerminal: false,
            logger: pino({level:'silent'}),
            browser: ['Safari', 'Mac OS', '15.0']
        });
        tempSock.ev.on('creds.update', saveCreds);
        if(!tempSock.authState.creds.registered){
            await delay(2000);
            let code = await tempSock.requestPairingCode(num);
            const id = Date.now().toString(36);
            pairingData = { code, expiry: Date.now()+60000, id };
            apiAttempts.set(id, { code, number: num });
            status = 'PAIRING';
            setTimeout(()=>{ pairingData.code = null }, 60000);
        }
    } catch(e){ console.log(e) }
    res.redirect('/');
});

async function startBot(){
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
        printQRInTerminal: false,
        logger: pino({level:'silent'}),
        browser: ['Safari', 'Mac OS', '15.0'],
        markOnlineOnConnect: true
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        if(connection === 'open'){
            status = 'CONNECTED';
            console.log('🌹 RANA FURQAN MD CONNECTED 🌹');
            try{
                await sock.sendMessage(config.ownerNumber + '@s.whatsapp.net', {
                    image: { url: config.botImage },
                    caption: `🌹 *${config.botName} CONNECTED!* 🌹\n\n✅ Bot Online Hai Bhai JAAN!`
                });
            }catch(e){}
        }
        if(connection === 'close'){
            let reason = lastDisconnect?.error?.output?.statusCode;
            if(reason !== DisconnectReason.loggedOut){
                startBot();
            } else {
                status = 'DISCONNECTED';
            }
        }
    });
    const pluginsPath = join(__dirname, 'plugins');
    let plugins = new Map();
    if(fs.existsSync(pluginsPath)){
        const files = fs.readdirSync(pluginsPath).filter(f=>f.endsWith('.js'));
        console.log(`🌹 Found ${files.length} Plugins - RANA FURQAN MD`);
        for(let file of files){
            try{
                const plugin = await import(`file://${join(pluginsPath, file)}?update=${Date.now()}`);
                plugins.set(file, plugin.default || plugin);
            }catch(e){ console.log(`Plugin Error ${file}:`, e.message) }
        }
    }
    sock.ev.on('messages.upsert', async (m) => {
        try{
            const msg = m.messages[0];
            if(!msg.message || msg.key.fromMe) return;
            const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || '';
            if(!body.startsWith(config.prefix)) return;
            const args = body.slice(config.prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            for(let [name, plugin] of plugins){
                try{
                    if(plugin.command && plugin.command.includes(command)){
                        await plugin.default ? plugin.default(sock, msg, args, { config }) : plugin(sock, msg, args, { config });
                    }
                }catch(e){ console.log(`Cmd Error ${command}:`, e.message) }
            }
        }catch(e){ console.log(e) }
    });
}

startBot();
app.listen(PORT, () => console.log(`🌹 ${config.botName} Running on ${PORT} - Safari Mode - API FIXED`));