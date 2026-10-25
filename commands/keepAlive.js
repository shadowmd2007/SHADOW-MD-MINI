import fs from 'fs';
import path from 'path';

const BOT_NAME = 'Shadow MD Mini';
const AUTH_DIR = './auth_info_baileys';

function log(message) {
console.log("[${BOT_NAME}] ${message}");
}

export function checkSession() {
try {
if (!fs.existsSync(AUTH_DIR)) {
fs.mkdirSync(AUTH_DIR, { recursive: true });
log('Auth directory created.');
return false;
}

const credsPath = path.join(AUTH_DIR, 'creds.json');

if (!fs.existsSync(credsPath)) {
  log('Session credentials not found.');
  return false;
}

if (fs.statSync(credsPath).size === 0) {
  log('Session credentials file is empty.');
  return false;
}

log('Session credentials file found.');
return true;

} catch (error) {
log("Session check error: ${error.message}");
return false;
}
}

export function keepAliveStatus() {
return {
botName: BOT_NAME,
sessionAvailable: checkSession()
};
}

export default {
name: 'keepAlive',
checkSession,
keepAliveStatus
};

log('KeepAlive module loaded.');