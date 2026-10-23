import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pino from "pino";
import pkg from "@whiskeysockets/baileys";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const makeWASocket = pkg.default;
const { useMultiFileAuthState, Browsers, delay } = pkg;

const app = express();
const PORT = process.env.PORT || 10000;
const AUTH = "./auth";

function cleanAuth(){ 
  try{ if(fs.existsSync(AUTH)) fs.rmSync(AUTH,{recursive:true,force:true}); }catch(e){}
}

app.use(express.static(__dirname));

app.get("/", async (req, res) => {
  const num = req.query.number;
  if (!num) return res.sendFile(path.join(__dirname, "index.html"));
  
  res.setHeader('Content-Type','application/json');
  try {
    let phone = String(num).replace(/[^0-9]/g,"");
    console.log("Trying for:", phone);
    cleanAuth();
    await delay(2000);
    const { state, saveCreds } = await useMultiFileAuthState(AUTH);
    const sock = makeWASocket({
      auth: state,
      browser: Browsers.macOS("Safari"),
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      markOnlineOnConnect: false
    });
    sock.ev.on("creds.update", saveCreds);
    await delay(6000);
    let code = await sock.requestPairingCode(phone);
    code = code.match(/.{1,4}/g).join("-");
    console.log("SUCCESS CODE:", code);
    return res.json({ code });
  } catch (e) {
    console.error("ERROR:", e.message);
    cleanAuth();
    return res.json({ error: e.message });
  }
});

app.listen(PORT, () => console.log("SHADOW MD LIVE ON", PORT));