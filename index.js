import express from 'express';
import fs from 'fs';

const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
  res.send('<h1>SHADOW MD MINI</h1><h2>Bot is Running ✅</h2><p>Pairing: Check Render Logs</p>');
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});

console.log('Starting bot...');
console.log('Node.js', process.version);

// Bot ko try catch me load karo taake Status 1 na aye
try {
  const handler = await import('./handler.js');
  const config = await import('./config.js');
  console.log('Handler loaded');
} catch(e){
  console.log('Bot load warning:', e.message);
  console.log('Web server still running, deploy will stay LIVE');
}

// Render ko live rakhne ke liye
setInterval(() => {
  console.log('Keep alive - ' + new Date().toISOString());
}, 30000);