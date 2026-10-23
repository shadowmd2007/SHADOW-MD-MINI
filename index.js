const express = require("express");
const fs = require("fs");
const path = require("path");
const pino = require("pino");
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require("@whiskeysockets/baileys");

const app = express();
const PORT = process.env.PORT || 10000;
const AUTH = "./auth";

function cleanAuth() {
  try {
    if (fs.existsSync(AUTH)) {
      fs.rmSync(AUTH, { recursive: true, force: true });
      console.log("Auth folder cleaned");
    }
  } catch {}
}

app.get("/", async (req, res) => {
  const num = req.query.number;

  if (!num) {
    try {
      const htmlFile = path.join(__dirname, "index.html");
      if (fs.existsSync(htmlFile)) {
        return res.sendFile(htmlFile);
      }
    } catch {}
    return res.send(`
      <html>
      <head><title>SHADOW MD</title></head>
      <body style="font-family:sans-serif;padding:20px">
        <h1>SHADOW MD</h1>
        <p>Link your WhatsApp with a pairing code</p>
        <form method="GET">
          <input name="number" placeholder="923001234567" style="padding:8px;width:200px"/>
          <button type="submit" style="padding:8px">Get pairing code</button>
        </form>
        <p>Digits only. No +, no leading 0. Example: 923001234567</p>
        <p>1. Enter number and tap Get pairing code.<br>
        2. WhatsApp > Settings > Linked devices<br>
        3. Link a device > Link with phone number instead<br>
        4. Type the code shown here.</p>
      </body>
      </html>
    `);
  }

  try {
    let phone = String(num).replace(/[^0-9]/g, "");
    console.log("Pair request for:", phone);
    
    cleanAuth();
    await delay(2000);

    const { state, saveCreds } = await useMultiFileAuthState(AUTH);
    const sock = makeWASocket({
      auth: state,
      browser: Browsers.macOS("Safari"),
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      syncFullHistory: false
    });

    sock.ev.on("creds.update", saveCreds);
    await delay(5000);

    let code = await sock.requestPairingCode(phone);
    code = code.match(/.{1,4}/g).join("-");
    console.log("SUCCESS CODE:", code);
    return res.json({ code: code });

  } catch (e) {
    console.log("Pair Failed:", e.message);
    cleanAuth();
    return res.json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log("SHADOW MD Server running on port", PORT);
});