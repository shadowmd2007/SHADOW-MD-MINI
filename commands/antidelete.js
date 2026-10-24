// File: antidelete.js
const fs = require('fs');
if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
const DB = './data/antidelete.json';
if (!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify({}));

cmd({
  pattern: "antidelete",
  alias: ["ad"],
  desc: "AntiDelete On Off",
  category: "group",
  react: "🗑️",
  filename: __filename
}, async (m, match) => {
  let db = JSON.parse(fs.readFileSync(DB));
  let arg = (match || "").toLowerCase();
  
  // ON wala code
  if (arg === "on") {
    db[m.chat] = true;
    fs.writeFileSync(DB, JSON.stringify(db));
    return m.reply("✅ *AntiDelete ON*\nAb delete msg wapis ayenge!");
  }
  
  // OFF wala code
  if (arg === "off") {
    delete db[m.chat];
    fs.writeFileSync(DB, JSON.stringify(db));
    return m.reply("❌ *AntiDelete OFF*");
  }
  
  let status = db[m.chat] ? "ON ✅" : "OFF ❌";
  return m.reply(`*ANTIDELETE*\nStatus: ${status}\n\n.antidelete on\n.antidelete off`);
});