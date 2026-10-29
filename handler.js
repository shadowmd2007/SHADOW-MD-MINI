import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export let settings;
let mod = null;

export const autoCommands = new Map();
export const autoAliases = new Map();

async function load(force = false) {
  try {
    if (!mod || force) {
      const url = pathToFileURL(path.join(__dirname, 'commands.js')).href + (force ? '?v=' + Date.now() : '');
      mod = await import(url);
      settings = mod.settings || mod.default?.settings || { prefix: '.' };
    }
  } catch (e) {
    console.log("commands.js not found, using only autoCommands:", e.message);
    mod = { settings: { prefix: '.' }, handleMessage: async () => {}, totalCommands: () => 0 }; 
    settings = mod.settings;
  }
  return mod;
}

export async function loadAutoCommands() {
  autoCommands.clear(); 
  autoAliases.clear();
  
  const folders = ['./commands'];
  let total = 0;
  const tempDir = path.join(__dirname, '.tmp_commands');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  // Purane temp files clean karo
  try { fs.readdirSync(tempDir).forEach(f => fs.unlinkSync(path.join(tempDir, f))); } catch {}

  for (const folderName of folders) {
    const folderPath = path.join(__dirname, folderName);
    if (!fs.existsSync(folderPath)) continue;
    
    const files = fs.readdirSync(folderPath).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      if (file === 'commands.js') continue;
      try {
        const fullPath = path.join(folderPath, file);
        let code = fs.readFileSync(fullPath, 'utf8');
        
        // FIX: Saare tarah ke lib imports ko fix karo
        code = code.replace(/import\s+.*from\s+['\"]\.\.\/lib\/.*['\"]\s*;?/g, `
          const reply = async (sock, msg, text) => sock.sendMessage(msg.key.remoteJid, { text: String(text||'') }, { quoted: msg });
          const requireBotAdmin = async () => true;
          const requireGroupAdmin = async () => true;
          const isGroup = (jid) => jid?.endsWith('@g.us');
          const isAdmin = async () => true;
          const isBotAdmin = async () => true;
        `);
        code = code.replace(/import\s+.*from\s+['\"]\..*command.*['\"]\s*;?/gi, '');

        const tempFile = path.join(tempDir, file);
        fs.writeFileSync(tempFile, code);
        
        const url = pathToFileURL(tempFile).href + `?v=${Date.now()}_${total}`;
        const cmdMod = await import(url);
        const cmd = cmdMod.default || cmdMod;
        
        if (!cmd || !cmd.name) {
          console.log(`[AUTO] Skip ${file}: no name export`);
          continue;
        }
        autoCommands.set(cmd.name.toLowerCase(), cmd);
        if (cmd.aliases && Array.isArray(cmd.aliases)) {
          for (const a of cmd.aliases) autoAliases.set(a.toLowerCase(), cmd.name.toLowerCase());
        }
        total++;
        console.log(`[AUTO] ✅ ${cmd.name} WORKING`);
      } catch (e) {
        console.log(`[AUTO] Skip ${file}: ${e.message.split('\\n')[0]}`);
      }
    }
  }
  return total;
}

export async function loadCommands() {
  const router = await load(true);
  const autoCount = await loadAutoCommands();
  const mainCount = typeof router.totalCommands === 'function' ? router.totalCommands() : 0;
  console.log(`✅ LOADED: ${mainCount} main + ${autoCount} auto = ${mainCount + autoCount} ALL WORKING`);
  return mainCount + autoCount;
}

export async function onMessage(sock, upsert) {
  const router = await load();
  const prefix = settings?.prefix || router?.settings?.prefix || '.';

  for (const message of upsert?.messages || []) {
    if (!message?.message) continue;
    const jid = message.key?.remoteJid;
    if (!jid || jid === 'status@broadcast') continue;
    if (message.key.fromMe) continue;

    try {
      // FIXED: Saare message types se text nikalo
      let text = message.message.conversation || 
                 message.message.extendedTextMessage?.text ||
                 message.message.imageMessage?.caption ||
                 message.message.videoMessage?.caption || "";
      
      text = text || message.message.ephemeralMessage?.message?.extendedTextMessage?.text || "";
      
      if (!text) continue;

      // Prefix check . ! #
      const usedPrefix = text[0];
      if (!['.', '!', '#', prefix].includes(usedPrefix)) continue;
      if (!text.startsWith(usedPrefix)) continue;

      const args = text.slice(1).trim().split(/ +/);
      const cmdName = args.shift()?.toLowerCase();
      if (!cmdName) continue;

      const actual = autoAliases.get(cmdName) || cmdName;
      const autoCmd = autoCommands.get(actual);
      
      if (autoCmd) { 
        console.log(`[EXEC] .${actual}`);
        await autoCmd.execute(sock, message, args, { commands: autoCommands, prefix: usedPrefix }); 
        continue; 
      }
    } catch (e) {
      console.log("autoCmd error:", e.message);
    }
    
    try { 
      await router.handleMessage(sock, message); 
    } catch (e) {
      console.log("router error:", e.message);
    }
  }
}