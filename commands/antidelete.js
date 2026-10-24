const fs = require('fs');
if (!fs.existsSync('./data')) fs.mkdirSync('./data',{recursive:true});
const DB = './data/antidelete.json';
if(!fs.existsSync(DB)) fs.writeFileSync(DB, JSON.stringify({}));

cmd({
  pattern: "antidelete",
  alias: ["ad"],
  desc: "Antidelete on/off",
  category: "group",
  react: "🗑️",
  filename: __filename
}, async (m, match) => {
  try {
    let db = JSON.parse(fs.readFileSync(DB));
    let arg = (match || "").toLowerCase().trim();
    
    if(arg === "on" || arg === "allon"){
      db[m.chat] = true;
      db.GLOBAL = true;
      fs.writeFileSync(DB, JSON.stringify(db, null, 2));
      return await m.reply("✅ *ANTIDELETE ALL ON - Har Jagah!*");
    }
    if(arg === "off" || arg === "alloff"){
      delete db[m.chat];
      db.GLOBAL = false;
      fs.writeFileSync(DB, JSON.stringify(db, null, 2));
      return await m.reply("❌ *ANTIDELETE OFF*");
    }
    
    let status = db[m.chat] || db.GLOBAL ? "ON ✅" : "OFF ❌";
    return await m.reply(`*ANTIDELETE*\nStatus: ${status}\n\n.antidelete allon - Har jagah ON\n.antidelete alloff - OFF`);
  } catch(e){
    return await m.reply("Error: "+e.message);
  }
});