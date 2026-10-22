import { default as makeWASocket, useMultiFileAuthState, Browsers } from '@whiskeysockets/baileys';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.join(__dirname, 'auth', 'main');

async function startBot(){
  console.log("[SHADOW-MD] Starting...");
  
  let cmdCount = 0;
  try{
    const files = fs.readdirSync(path.join(__dirname, 'commands'));
    cmdCount = files.filter(f=>f.endsWith('.js')).length;
  }catch(e){ cmdCount = 0; }
  console.log(`[SHADOW-MD] COMMANDS: ${cmdCount}`);

  if(!fs.existsSync(AUTH_DIR)){
    console.log("No auth found, starting web pairing...");
  } else {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const sock = makeWASocket({
      auth: state,
      logger: pino({level: 'silent'}),
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
}

startBot();
import('./web.js'); 