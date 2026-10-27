// ========== RANA FURQAN MD - V5 FINAL - FULL INDEX ==========
const express = require('express');
const fs = require('fs');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, Browsers, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_FOLDER = './auth_info_baileys';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let globalSock = null;
let lastPairingCode = null;
let connectionStatus = 'DISCONNECTED';

// ===== MAIN PAIRING PAGE =====
app.get('/', async (req, res) => {
    const phoneNumber = req.query.number;

    // Agar number diya hai to code generate karo
    if (phoneNumber && globalSock) {
        try {
            const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
            if (cleanNumber.length < 10) {
                lastPairingCode = 'ERROR: Number Galat Hai';
            } else {
                // V5 ka pairing method
                await new Promise(r => setTimeout(r, 2000));
                if (!globalSock.authState.creds.registered) {
                    lastPairingCode = await globalSock.requestPairingCode(cleanNumber);
                    console.log(`[RANA FURQAN MD V5] Pairing Code for ${cleanNumber}: ${lastPairingCode}`);
                } else {
                    lastPairingCode = 'ALREADY CONNECTED';
                }
            }
        } catch (err) {
            console.log('Pairing Error:', err.message);
            lastPairingCode = 'ERROR: ' + err.message;
        }
    }

    // HTML Response
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>RANA FURQAN MD V5</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            *{margin:0;padding:0;box-sizing:border-box}
            body{background:#000;color:#fff;font-family:Arial,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;padding:15px}
            .main{background:#111;border:2px solid #ff0000;border-radius:20px;padding:30px;width:100%;max-width:360px;text-align:center;box-shadow:0 0 30px rgba(255,0,0,0.5)}
            h1{color:#ff0000;font-size:22px;margin-bottom:10px}
            .status{padding:8px;border-radius:8px;margin:15px 0;font-size:13px;font-weight:bold}
            .disconnected{background:#330000;color:#ff5555}
            .connected{background:#003300;color:#55ff55}
            input{width:100%;padding:14px;border-radius:12px;border:none;outline:none;text-align:center;font-size:17px;margin:10px 0;background:#222;color:#fff}
            button{width:100%;padding:14px;border-radius:12px;border:none;background:#ff0000;color:#fff;font-weight:bold;font-size:16px;cursor:pointer;margin-top:5px}
            button:hover{background:#cc0000}
            .code-box{margin-top:20px;background:#000;border:1px dashed #00ff00;border-radius:12px;padding:15px}
            .code{font-size:36px;letter-spacing:5px;color:#00ff00;font-weight:bold}
            .info{font-size:11px;color:#aaa;margin-top:10px;line-height:1.4}
        </style>
    </head>
    <body>
        <div class="main">
            <h1>🔥 RANA FURQAN MD 🔥</h1>
            <p style="font-size:12px;color:#ccc">VERSION 5 - FINAL</p>
            
            <div class="status ${connectionStatus === 'CONNECTED' ? 'connected' : 'disconnected'}">
                STATUS: ${connectionStatus}
            </div>

            ${connectionStatus === 'CONNECTED' ? `
                <h2 style="color:#00ff00">✅ BOT CONNECTED!</h2>
                <p style="font-size:13px;margin-top:10px">Ab WhatsApp pe .ping likh ke check karo</p>
            ` : `
                <form method="GET" action="/">
                    <input type="text" name="number" placeholder="923xxxxxxxxx" required value="${phoneNumber || ''}" />
                    <button type="submit">GET PAIRING CODE</button>
                </form>

                ${lastPairingCode ? `
                <div class="code-box">
                    <div class="code">${lastPairingCode}</div>
                    <div class="info">
                        WhatsApp kholo > Settings > Linked Devices<br>
                        > Link a Device > Link with phone number<br>
                        Upar wala 8 digit code dalo (20 sec me)
                    </div>
                </div>
                ` : `
                <div class="info">Apna WhatsApp number 92 ke sath likho<br>Example: 923012345678</div>
                `}
            `}
        </div>
    </body>
    </html>
    `);
});

// Health check for Railway
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// ===== BOT START FUNCTION - FULL ERROR FREE =====
async function startBot() {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);

        globalSock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            browser: Browsers.macOS('Desktop'),
            printQRInTerminal: false,
            syncFullHistory: false,
        });

        globalSock.ev.on('creds.update', saveCreds);

        globalSock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                connectionStatus = 'CONNECTED';
                lastPairingCode = null;
                console.log('✅ RANA FURQAN MD V5 - CONNECTED SUCCESSFULLY!');
            }

            if (connection === 'close') {
                connectionStatus = 'DISCONNECTED';
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                console.log('Connection Closed, Code:', statusCode);

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('Logged Out - Deleting Auth');
                    if (fs.existsSync(AUTH_FOLDER)) {
                        fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    }
                    lastPairingCode = null;
                    setTimeout(startBot, 3000);
                } else if (statusCode !== DisconnectReason.connectionClosed) {
                    // Auto reconnect for all other errors
                    console.log('Reconnecting in 3 sec...');
                    setTimeout(startBot, 3000);
                } else {
                    setTimeout(startBot, 3000);
                }
            }
        });

        // ===== MESSAGE HANDLER - BOT COMMANDS =====
        globalSock.ev.on('messages.upsert', async (m) => {
            try {
                const msg = m.messages[0];
                if (!msg || !msg.message || msg.key.fromMe) return;

                const from = msg.key.remoteJid;
                const type = Object.keys(msg.message)[0];
                const body = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || '';

                // Commands
                if (body.toLowerCase() === '.ping') {
                    await globalSock.sendMessage(from, { text: '🏓 *PONG!*\n\n🔥 RANA FURQAN MD V5 Active Hai Bhai JAAN! ✅' });
                }
                if (body.toLowerCase() === '.menu') {
                    await globalSock.sendMessage(from, { text: `*🔥 RANA FURQAN MD V5 MENU 🔥*\n\n.ping - Bot Active Check\n.menu - Ye Menu\n.owner - Owner\n\n*Bot Owner: RANA FURQAN* 👑` });
                }
                if (body.toLowerCase() === '.owner') {
                    await globalSock.sendMessage(from, { text: '*👑 OWNER: RANA FURQAN MD*\n\nWhatsApp Bot V5 - No Error - Full Working!' });
                }

            } catch (err) {
                console.log('Message Handler Error:', err.message);
            }
        });

    } catch (err) {
        console.log('StartBot Error:', err.message);
        setTimeout(startBot, 5000);
    }
}

// Start Server
app.listen(PORT, () => {
    console.log(`[RANA FURQAN MD V5] Server Running on Port ${PORT}`);
    startBot();
});
// ========== END OF FULL FILE ==========