const express = require('express');
const fs = require('fs');
const path = require('path');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason, makeCacheableSignalKeyStore, delay } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = './auth_info_baileys';
const COMMANDS_FOLDER = './commands';

if (!fs.existsSync(COMMANDS_FOLDER)) fs.mkdirSync(COMMANDS_FOLDER);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let sock = null;
let pairingData = { code: null, expireAt: null, number: null };
let status = 'DISCONNECTED';

function loadCommands() {
    try {
        return fs.existsSync(COMMANDS_FOLDER) ? fs.readdirSync(COMMANDS_FOLDER).filter(f => f.endsWith('.js')).map(f => f.replace('.js','')) : [];
    } catch { return []; }
}

app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>RANA FURQAN MD</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
body{background:#000;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}
.card{background:#0f0f0f;border:2px solid red;border-radius:25px;padding:25px;width:360px;text-align:center;box-shadow:0 0 25px red}
.dp{width:90px;height:90px;border-radius:50%;border:3px solid red;margin:0 auto 10px;display:block;object-fit:cover}
h1{color:red;margin:5px 0}
input{width:100%;padding:13px;border-radius:12px;border:none;margin:10px 0;text-align:center;font-size:17px;background:#222;color:#fff}
button{width:100%;padding:13px;border-radius:12px;border:none;background:red;color:#fff;font-weight:bold;font-size:16px;cursor:pointer}
.code{font-size:32px;letter-spacing:3px;color:#00ff00;background:#000;padding:12px;border-radius:12px;margin-top:15px;border:1px dashed #0f0}
.timer{color:yellow;font-size:14px;margin-top:8px}
</style>
</head>
<body>
<div class="card">
<img class="dp" src="https://i.ibb.co/3Y9x6rK8/IMG-20250520-WA0000.jpg" onerror="this.src='https://i.pravatar.cc/150?u=rana'" />
<h1>🌹 RANA FURQAN MD 🌹</h1>
<p style="font-size:12px;color:#aaa">STATUS: ${status}</p>
${status === 'CONNECTED' ? '<h2 style="color:#0f0;margin-top:15px">✅ BOT CONNECTED 🌹</h2><p>WhatsApp pe .menu likho</p>' : `
<form method="GET" action="/getcode">
<input name="number" placeholder="923xxxxxxxxx" required value="${pairingData.number || ''}" />
<button type="submit">GET 8 LETTER CODE</button>
</form>
${pairingData.code ? `
<div class="code">${pairingData.code}</div>
<div class="timer" id="timer">Valid: 60s</div>
<p style="font-size:11px;color:#ccc;margin-top:8px">Linked Devices > Link with phone number</p>
<script>
let exp=${pairingData.expireAt || 0};
let iv=setInterval(()=>{
let left=Math.max(0,Math.floor((exp-Date.now())/1000));
document.getElementById('timer').innerText='Valid: '+left+'s - Jaldi lagao';
if(left<=0){clearInterval(iv); document.getElementById('timer').innerText='EXPIRED - Dubara GET CODE dabao';}
},1000);
</script>
` : '<p style="font-size:12px;color:#888;margin-top:10px">Number 92 ke sath likho</p>'}
`}
</div>
</body>
</html>
`);
});

app.get('/getcode', async (req, res) => {
    let num = (req.query.number || '').replace(/[^0-9]/g,'');
    if(!num) return res.redirect('/');
    if(!sock) return res.send('Bot starting... 5 sec baad refresh karo');
    try {
        await delay(4000); // FIX FOR COULDN'T LINKED
        if(sock.authState.creds.registered) { status='CONNECTED'; return res.redirect('/'); }
        let rawCode = await sock.requestPairingCode(num);
        let formatted = rawCode.match(/.{1,4}/g).join('-'); // 8 LETTERS XXXX-XXXX
        pairingData = { code: formatted, raw: rawCode, number: num, expireAt: Date.now() + 60000 };
        console.log('CODE:', formatted);
    } catch(e) { pairingData.code = 'ERROR: '+e.message; console.log(e.message); }
    res.redirect('/');
});

async function startBot() {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    sock = makeWASocket({
        auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, pino({level:'silent'})) },
        logger: pino({level:'silent'}),
        browser: Browsers.macOS('Safari'),
        printQRInTerminal: false,
    });
    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', (u) => {
        const { connection, lastDisconnect } = u;
        if(connection === 'open'){ status='CONNECTED'; pairingData={code:null,expireAt:null,number:null}; console.log('✅ CONNECTED'); }
        if(connection === 'close'){
            status='DISCONNECTED';
            let code = lastDisconnect?.error?.output?.statusCode;
            if(code === DisconnectReason.loggedOut){ if(fs.existsSync(AUTH_FOLDER)) fs.rmSync(AUTH_FOLDER,{recursive:true,force:true}); }
            setTimeout(startBot, 3000);
        }
    });

    sock.ev.on('messages.upsert', async ({messages}) => {
        const msg = messages[0];
        if(!msg?.message || msg.key.fromMe) return;
        const from = msg.key.remoteJid;
        const text = (msg.message.conversation || msg.message.extendedTextMessage?.text || '').trim();

        if(text.toLowerCase() === '.menu' || text.toLowerCase() === 'menu'){
            const cmds = loadCommands();
            let extra = cmds.length ? cmds.map(c=>`🌹  *${c.toUpperCase()}*  🌹`).join('\n') : '🌹  *FILHAL KOI EXTRA FILE NAHI*  🌹';
            let menuText = `
*🌹 ╔════════════════════════╗ 🌹*
*🌹 ║   RANA FURQAN MD BOT   ║ 🌹*
*🌹 ╚════════════════════════╝ 🌹*

*🌹  BEHTREEN COMMANDS BARE LAFZON ME  🌹*

🌹  *PING*  🌹
- BOT ACTIVE HAI YA NAHI CHECK KARO

🌹  *MENU*  🌹
- YE BEHTREEN MENU DEKHO

🌹  *OWNER*  🌹
- OWNER KA PATA KARO

🌹  *ALIVE*  🌹
- BOT ZINDA HAI YA NAHI

*🌹 ╔════ AUTO COMMANDS ════╗ 🌹*
${extra}
*🌹 ╚═══════════════════════╝ 🌹*

*🌹 OWNER: RANA FURQAN 👑 🌹*
`;
            await sock.sendMessage(from, { text: menuText });
        }
        if(text.toLowerCase() === '.ping') await sock.sendMessage(from, {text: '🌹 *PONG!* 🌹\n\n🔥 *RANA FURQAN MD ACTIVE HAI* 🔥 🌹'});
        if(text.toLowerCase() === '.owner') await sock.sendMessage(from, {text: '🌹 *👑 OWNER: RANA FURQAN MD 👑* 🌹'});
        if(text.toLowerCase() === '.alive') await sock.sendMessage(from, {text: '🌹 *BOT ALIVE HAI JAAN!* 🌹 ✅'});
    });
}

app.get('/health',(req,res)=>res.send('OK'));
app.listen(PORT,()=>{ console.log('Server Running '+PORT); startBot(); });