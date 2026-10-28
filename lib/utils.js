const fs = require("fs");
const path = require("path");
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require("@whiskeysockets/baileys");

const sessionPath = path.join(__dirname, "session");

// Session check function
async function checkSession() {
    try {
        if (!fs.existsSync(sessionPath)) {
            return { status: false, message: "Session nahi mila, pehle pair karo" };
        }
        return { status: true, message: "✅ Session OK" };
    } catch (e) {
        return { status: false, message: e.message };
    }
}

// Socket banane ka function
async function makeSocket() {
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const sock = makeWASocket({
        auth: state,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop"),
    });
    sock.ev.on("creds.update", saveCreds);
    return sock;
}

// Delay function
function sleep(ms) {
    return delay(ms);
}

module.exports = {
    checkSession,
    makeSocket,
    sleep
};