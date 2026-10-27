import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers, delay } from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESS_DIR = path.join(__dirname, '..', 'sessions');
if(!fs.existsSync(SESS_DIR)) fs.mkdirSync(SESS_DIR, {recursive:true});

export class PairingError extends Error {
  constructor(msg, status=400){ super(msg); this.httpStatus=status; }
}

const attempts = new Map();

function publicView(id){
  const a = attempts.get(id);
  if(!a) return null;
  return a.public;
}

export async function startPairing(rawNumber){
  let number = (rawNumber||'').toString().replace(/\D/g,'');
  if(!number || number.length < 10) throw new PairingError('Sahi number likho! Example: 923003719761', 400);
  
  const id = Math.random().toString(36).slice(2)+Date.now().toString(36);
  const dir = path.join(SESS_DIR, 'pair-'+id);
  fs.mkdirSync(dir, {recursive:true});

  const { state, saveCreds } = await useMultiFileAuthState(dir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, {log:()=>{}}) },
    browser: Browsers.macOS('Safari'),
    printQRInTerminal: false,
    logger: { level: 'silent', child: ()=>({ level: 'silent' }) },
  });

  sock.ev.on('creds.update', saveCreds);

  const pub = { status: 'pending', code: null, created: Date.now() };
  attempts.set(id, { public: pub, sock, dir });

  setTimeout(()=>{ try{sock.end()}catch{} }, 65000);

  try{
    await delay(1500);
    const code = await sock.requestPairingCode(number);
    pub.code = code;
    console.log(`🌹 RANA FURQAN MD Pairing code ${number}: ${code}`);
  }catch(e){
    console.error('pairing error', e.message);
    throw new PairingError('WhatsApp pairing fail: '+e.message+' - 10 sec baad retry karo', 500);
  }

  return { id, ...pub };
}

export function getPublic(id){ return publicView(id); }
export function cancel(id){ 
  const a = attempts.get(id);
  if(a){ try{a.sock.end()}catch{} }
  return attempts.delete(id); 
}
export function stats(){ return { total: attempts.size }; }

// 🌹 Wrapper jo server.js dhoondta hai
export function createSessionManager({config, logger}){
  return {
    stats, getPublic, cancel,
    startPairing,
    on: ()=>{},
  };
}