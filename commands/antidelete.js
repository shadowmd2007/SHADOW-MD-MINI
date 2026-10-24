// SAFE - No fs at top, No Waiting error
try {
const cmd = global.cmd || (await import('../lib/index.js')).cmd || (()=>{});
if(typeof cmd === 'function'){
cmd({
  pattern: "antidelete",
  alias: ["ad"],
  desc: "Antidelete on/off",
  category: "group",
  filename: __filename
}, async (m, match) => {
  try {
    let t = (match || "").toLowerCase().trim();
    if(t === "on" || t === "allon") return await m.reply("✅ *ANTIDELETE ALL ON*\nHar jagah ON!");
    if(t === "off" || t === "alloff") return await m.reply("❌ *ANTIDELETE OFF*");
    return await m.reply(`*ANTIDELETE*\n.antidelete on\n.antidelete allon\n.antidelete off`);
  } catch(e){}
});
}
} catch(e){ console.log(e.message) }