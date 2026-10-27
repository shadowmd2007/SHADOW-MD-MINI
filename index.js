try { const d = await import('dotenv'); (d.default ?? d).config(); } catch {}
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pino from 'pino';
import makeWASocket, { useMultiFileAuthState, delay, makeCacheableSignalKeyStore, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const app = express();
const PORT = process.env.PORT || config.port || 3000;

let status = 'DISCONNECTED';
let pairingData = { code: null, expiry: null, id: null };
let sock = null;
const apiAttempts = new Map();

app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// 🌹 Clean old auth before new pair - YEHI FIX THA!
function cleanAuth(dir){
  try{ if(fs.existsSync(dir)) fs.rmSync(dir, {recursive:true, force:true}); }catch{}
  fs.mkdirSync(dir, {recursive:true});
}

app.get('/api/info', (req,res)=>{
  res.json({ botName: config.botName, ownerName: 'RANA FURQAN', image: config.botImage, botImage: config.botImage });
});
app.get('/health', (req,res)=> res.json({ok:true, status}));

// 🌹 REAL PAIR - AB 100% LINK HOGA
app.post('/api/pair', async (req,res)=>{
  let num = (req.body?.number || '').toString().replace(/[^0-9]/g,'');
  if(!num) return res.status(400).json({error:'Number do!'});
  try{
    // 🌹 IMPORTANT: Har pair ke liye fresh folder
    const pairDir = join(__dirname, 'auth', `pair-${Date.now()}`);
    cleanAuth(pairDir);
    
    const { state, saveCreds } = await useMultiFileAuthState(pairDir);
    const { version } = await fetchLatestBaileysVersion();
    const tempSock = makeWASocket({
      version,
      auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
      printQRInTerminal: false,
      logger: pino({level:'silent'}),
      browser: ['Chrome','Windows','10'],
    });
    tempSock.ev.on('creds.update', saveCreds);
    
    await delay(2000);
    let code = await tempSock.requestPairingCode(num);
    // 🌹 Code ko XXXX-XXXX format me dikhao
    let prettyCode = code.includes('-') ? code : code.slice(0,4)+'-'+code.slice(4);
    const id = Date.now().toString(36);
    
    pairingData = { code: prettyCode, raw: code, expiry: Date.now()+120000, id, dir: pairDir, sock: tempSock };
    apiAttempts.set(id, { code: prettyCode, raw: code, number: num, dir: pairDir, sock: tempSock });
    
    console.log(`🌹 RANA FURQAN PAIR ${num} => ${prettyCode} (raw:${code})`);
    
    // 🌹 Jab WhatsApp pe code daloge to ye listener creds ko main auth me copy karega
    tempSock.ev.on('connection.update', async (u)=>{
      if(u.connection === 'open'){
        console.log('🌹 Pairing Success - Copying creds to main auth');
        try{
          // pairDir se main authDir me copy
          const mainDir = config.authDir;
          cleanAuth(mainDir);
          for(let f of fs.readdirSync(pairDir)){
            fs.copyFileSync(join(pairDir,f), join(mainDir,f));
          }
          status = 'CONNECTED';
        }catch(e){ console.log('copy error', e.message) }
      }
    });
    
    setTimeout(()=>{ try{tempSock.end()}catch{} }, 120000);
    
    return res.json({ id, code: prettyCode, raw: code });
  }catch(e){
    console.error('pair error', e.message);
    return res.status(500).json({error: e.message});
  }
});

app.get('/api/pair/:id', (req,res)=>{
  const a = apiAttempts.get(req.params.id);
  if(!a) return res.status(404).json({error:'ID not found'});
  return res.json({code: a.code});
});

// 🌹 Purana page - Logo same rahega
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
.code{font-size:28px;letter-spacing:3px;color:#00ff00;background:#000;padding:12px;border-radius:12px;margin-top:15px;border:1px dashed #0f0}
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
${pairingData.code ? `<div class="code">${pairingData.code}</div><div style="color:yellow;font-size:12px;margin-top:8px">Valid 120s</div>` : ''}
`}
</div>
</body>
</html>
`);
});

app.get('/getcode', async (req,res)=>{
  let num = (req.query.number || '').replace(/[^0-9]/g,'');
  if(!num) return res.redirect('/');
  res.redirect(`/public/index.html?number=${num}`);
});

async function startBot(){
    if(!fs.existsSync(config.authDir) || fs.readdirSync(config.authDir).length===0){
      status = 'DISCONNECTED';
      console.log('🌹 No creds yet - waiting for pairing');
      return;
    }
    const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
    sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino().child({level:'silent'})) },
        printQRInTerminal: false,
        logger: pino({level:'silent'}),
        browser: ['Chrome','Windows','10'],
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
                    caption: `🌹 *${config.botName} CONNECTED!* 🌹\n\n✅ Bot Online Hai Bhai JAAN!\n📱 Number: ${config.ownerNumber}`
                });
            }catch(e){}
        }
        if(connection === 'close'){
            let reason = lastDisconnect?.error?.output?.statusCode;
            if(reason !== DisconnectReason.loggedOut){
                setTimeout(startBot, 3000);
            } else {
                status = 'DISCONNECTED';
            }
        }
    });
    const pluginsPath = join(__dirname, 'plugins');
    let plugins = new Map();
    if(fs.existsSync(pluginsPath)){
        const files = fs.readdirSync(pluginsPath).filter(f=>f.endsWith('.js'));
        console.log(`🌹 Found ${files.length} Plugins`);
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
app.listen(PORT, () => console.log(`🌹 ${config.botName} Running on ${PORT} - FIXED PAIRING`));