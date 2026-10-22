const { default: makeWASocket, useMultiFileAuthState, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'auth', 'main');

async function startBot(){
  console.log("[SHADOW-MD] Starting...");
  
  // Commands count karo
  let cmdCount = 0;
  try{
    const files = fs.readdirSync('./commands');
    cmdCount = files.filter(f=>f.endsWith('.js')).length;
  }catch(e){ cmdCount = 0; }
  console.log(`[SHADOW-MD] COMMANDS: ${cmdCount}`);

  if(!fs.existsSync(AUTH_DIR)){
    console.log("No auth found, please pair via web link");
    require('./web.js');
    return;
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const sock = makeWASocket({
    auth: state,
    logger: pino({level: 'silent'}), // silent = koi key log nahi hogi
    browser: Browsers.macOS('Chrome'),
    printQRInTerminal: false
  });
  
  sock.ev.on('creds.update', saveCreds);
  
  sock.ev.on('connection.update', ({connection})=>{
    if(connection === 'open'){
      console.log(`SHADOW-MD Connected - COMMANDS: ${cmdCount}`);
    }
  });
}

startBot();
require('./web.js');
