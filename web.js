const express = require("express");
const fs = require("fs");
const path = require("path");
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers } = require("@whiskeysockets/baileys");

const app = express();
const AUTH = "./auth";

function delAuth(){
  try{
    if(fs.existsSync(AUTH)) fs.rmSync(AUTH,{recursive:true,force:true});
  }catch{}
}

app.get("/", async (req,res)=>{
  let num = req.query.number || req.query.num;
  if(!num){
    return res.sendFile(path.join(__dirname,"/pair.html"));
  }
  let phone = num.replace(/[^0-9]/g,"");
  await delAuth();
  await delay(1500);
  try{
    const {state,saveCreds} = await useMultiFileAuthState(AUTH);
    const sock = makeWASocket({
      auth: state,
      browser: Browsers.macOS("Safari"),
      logger:{level:"silent"}
    });
    sock.ev.on("creds.update",saveCreds);
    await delay(3500);
    let code = await sock.requestPairingCode(phone);
    code = code.match(/.{1,4}/g).join("-");
    console.log("CODE:",code);
    return res.json({code:code});
  }catch(e){
    console.log("Retry:",e.message);
    await delAuth();
    await delay(2000);
    try{
      const {state,saveCreds} = await useMultiFileAuthState(AUTH);
      const sock2 = makeWASocket({
        auth:state,
        browser: Browsers.macOS("Safari"),
        logger:{level:"silent"}
      });
      sock2.ev.on("creds.update",saveCreds);
      await delay(3500);
      let code2 = await sock2.requestPairingCode(phone);
      code2 = code2.match(/.{1,4}/g).join("-");
      return res.json({code:code2});
    }catch(e2){
      return res.json({error:"5 sec baad dobara try karo - "+e2.message});
    }
  }
});

module.exports = app;