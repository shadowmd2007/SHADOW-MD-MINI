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

function cleanAuth(){ try{ if(fs.existsSync(AUTH)) fs.rmSync(AUTH,{recursive:true,force:true}); }catch{} }

app.use(express.static(__dirname));

app.get("/", async (req, res) => {
  const num = req.query.number;
  if (!num) return res.sendFile(path.join(__dirname, "index.html"));
  try {
    let phone = String(num).replace(/[^0-9]/g,"");
    cleanAuth();
    await delay(1000);
    const { state, saveCreds } = await useMultiFileAuthState(AUTH);
    const sock = makeWASocket({ auth: state, browser: Browsers.macOS("Safari"), logger: pino({level:"silent"}), printQRInTerminal:false });
    sock.ev.on("creds.update", saveCreds);
    await delay(8000);
    let code = await sock.requestPairingCode(phone);
    code = code.match(/.{1,4}/g).join("-");
    console.log("CODE:",code);
    return res.json({ code });
  } catch (e) {
    console.log(e);
    cleanAuth();
    return res.json({ error: "Try again after 30 sec: " + e.message });
  }
});
app.listen(PORT, ()=>console.log("LIVE ON",PORT));