// File: keepAlive.js - Deploy pe logout rokne ke liye
const fs = require('fs');
console.log('✅ KeepAlive Loaded');

if (process.env.SESSION_ID) {
  try {
    let sess = process.env.SESSION_ID.replace('SHADOW~','');
    let data = Buffer.from(sess, 'base64').toString();
    if (!fs.existsSync('./auth_info_baileys')) fs.mkdirSync('./auth_info_baileys', { recursive: true });
    fs.writeFileSync('./auth_info_baileys/creds.json', data);
    console.log('✅ Session Restored - Bot Disconnect Nahi Hoga!');
  } catch {}
}