const express = require("express");
const fs = require("fs");
const pino = require("pino");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;
const AUTH = "./auth";

function cleanAuth(){
  try{ if(fs.existsSync(AUTH)) fs.rmSync(AUTH,{recursive:true,force:true}); }catch{}
}

app.get("/", async (req,res)=>{
  const num = req.query.number;
  if(!num){
    try{
      if(fs.existsSync(path.join(__dirname,"index.html"))) return res.sendFile(path.join(__dirname,"index.html"));
    }catch{}
    return res.send(`<h2>SHADOW-MD-MINI-4</h2><form><input name="number" placeholder="923xxxxxxxxx"/><button>Get Pair Code</button></form>`);
  }

  let phone = (num+"").replace(/[^0-9]/g,"");
  console.log("Request for",phone);
  cleanAuth();

  for(let attempt=1; attempt<=3; attempt++){
    try{
      console.log(`Attempt ${attempt} for ${phone}`);
      const baileys = require("@whiskeysockets/baileys");
      const makeWASocket = baileys.default;
      const { useMultiFileAuthState, Browsers, delay, fetchLatestBaileysVersion } = baileys;

      const { version } = await fetchLatestBaileysVersion();
      const { state, saveCreds } = await useMultiFileAuthState(AUTH);

      const sock = makeWASocket({
        version,
        auth: state,
        browser: Browsers.macOS("Safari"),
        logger: pino({level:"silent"}),
        printQRInTerminal: false,
        syncFullHistory: false,
        markOnlineOnConnect: false
      });
      sock.ev.on("creds.update", saveCreds);

      await delay(6000);

      let code = await sock.requestPairingCode(phone);
      code = code.match(/.{1,4}/g).join("-");
      console.log("SUCCESS CODE:",code," Attempt:",attempt);
      return res.json({ code: code });

    }catch(e){
      console.log(`Attempt ${attempt} failed:`, e.message);
      cleanAuth();
      if(attempt === 3){
        return res.json({ error: "Connection Closed - 15 sec baad retry karo. Render IP busy hai, 2-3 bar try karo, ho jayega!" });
      }
      await new Promise(r=>setTimeout(r,4000));
    }
  }
});

app.listen(PORT, ()=>console.log("Live on",PORT));