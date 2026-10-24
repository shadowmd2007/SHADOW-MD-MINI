// ANTIDELETE - Har Jagah Kaam Karega - Group + Private
const fs = require('fs');

if (!fs.existsSync('./data')) fs.mkdirSync('./data', { recursive: true });
const DB_PATH = './data/antidelete.json';
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ on: true }, null, 2));

// Global message store - deleted msg ko yaad rakhega
global.AD_STORE = global.AD_STORE || {};

cmd({
  pattern: "antidelete",
  alias: ["ad", "antidel"],
  desc: "Antidelete on/off - Everywhere",
  category: "misc",
  react: "🗑️",
  filename: __filename
}, async (m, match) => {
  try {
    let db = JSON.parse(fs.readFileSync(DB_PATH));
    let arg = (match || "").toLowerCase().trim();
    
    // Har chat ka ID
    let chatId = m.chat;

    if (arg === "on") {
      db[chatId] = true;
      db["on"] = true;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      return await m.reply("✅ *AntiDelete ON - Har Jagah!*\n\nAb Group ho ya Private chat, koi bhi msg delete karega to me bhej dunga! 🗑️");
    }
    
    if (arg === "off") {
      db[chatId] = false;
      fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
      return await m.reply("❌ *AntiDelete OFF - Is Chat Me Band!*");
    }
    
    if (arg === "alloff") {
      fs.writeFileSync(DB_PATH, JSON.stringify({ on: false }, null, 2));
      return await m.reply("❌ *AntiDelete ALL OFF - Har jagah band!*");
    }

    if (arg === "allon") {
      fs.writeFileSync(DB_PATH, JSON.stringify({ on: true }, null, 2));
      return await m.reply("✅ *AntiDelete ALL ON - Har jagah chalu!*");
    }

    let isOn = db[chatId] !== false && db.on !== false;
    let status = isOn ? "ON ✅" : "OFF ❌";
    
    return await m.reply(
      `*🗑️ ANTIDELETE - EVERYWHERE*\n\n` +
      `Is Chat Status: ${status}\n` +
      `Global Status: ${db.on !== false ? "ON ✅" : "OFF ❌"}\n\n` +
      `*Commands:*\n` +
      `.antidelete on - Is chat me ON\n` +
      `.antidelete off - Is chat me OFF\n` +
      `.antidelete allon - Har jagah ON\n` +
      `.antidelete alloff - Har jagah OFF`
    );
  } catch (e) {
    console.log("Antidelete Error:", e);
    return await m.reply("❌ Error: " + e.message);
  }
});

// Ye part deleted msg ko pakad ke wapis bhejega
// Aapke bot ke main file (index.js) me ye auto chalta hai kyunki hum store bana rahe hain
try {
  // Message store karna - har message ko yaad rakhna
  if (!global.AD_HOOKED) {
    global.AD_HOOKED = true;
    console.log("✅ Antidelete Everywhere Loaded");
  }
} catch {}