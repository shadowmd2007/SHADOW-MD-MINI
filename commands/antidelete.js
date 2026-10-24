cmd({
  pattern: "antidelete",
  desc: "Antidelete on/off",
  category: "group",
  filename: __filename
}, async (m, match) => {
  try {
    const fs = require('fs');
    let path = './data/antidelete.json';
    if (!fs.existsSync('./data')) fs.mkdirSync('./data');
    if (!fs.existsSync(path)) fs.writeFileSync(path, '{}');
    
    let db = JSON.parse(fs.readFileSync(path));
    let txt = (match || "").toLowerCase();
    
    if(txt === "on"){
      db[m.chat] = true;
      fs.writeFileSync(path, JSON.stringify(db));
      return m.reply("✅ Antidelete ON");
    }
    if(txt === "off"){
      delete db[m.chat];
      fs.writeFileSync(path, JSON.stringify(db));
      return m.reply("❌ Antidelete OFF");
    }
    if(txt === "allon"){
      fs.writeFileSync(path, JSON.stringify({GLOBAL:true}));
      return m.reply("✅ Antidelete ALL ON - Har jagah");
    }
    
    let on = db[m.chat] || db.GLOBAL ? "ON ✅" : "OFF ❌";
    return m.reply(`Status: ${on}\n.antidelete on\n.antidelete allon\n.antidelete off`);
  } catch(e){
    return m.reply("Error: "+e.message);
  }
});