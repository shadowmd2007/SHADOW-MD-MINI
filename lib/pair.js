const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require("fs");
const path = require("path");

// Path fix for lib folder
const sessionPath = path.join(__dirname, "session");

async function PairCode(req, res) {
    const num = req.query.number;
    if (!num) return res.json({ error: "Number add karo ?number=923xx" });

    if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    
    try {
        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: "silent" }),
            browser: Browsers.macOS("Desktop"),
            printQRInTerminal: false
        });

        sock.ev.on("creds.update", saveCreds);

        if (!sock.authState.creds.registered) {
            await delay(1500);
            let phoneNumber = num.replace(/[^0-9]/g, '');
            let code = await sock.requestPairingCode(phoneNumber);
            code = code?.match(/.{1,4}/g)?.join("-") || code;
            
            console.log(`Pair Code: ${code}`);
            
            if (!res.headersSent) {
                res.json({ 
                    status: "✅ Success - Lib Folder",
                    pair_code: code,
                    message: "Code WhatsApp me dalo"
                });
            }
        }

        sock.ev.on("connection.update", async (s) => {
            if (s.connection === "open") {
                console.log("✅ Pairing Success! Session saved in lib/session");
            }
        });

    } catch (err) {
        console.log("Error:", err);
        if (!res.headersSent) {
            res.json({ error: "Failed", details: err.message });
        }
    }
}

module.exports = PairCode;