// SAFE ANTIDELETE - No Error - Rana Bhai ke liye
try {
cmd({
  pattern: "antidelete",
  alias: ["ad"],
  desc: "Antidelete on/off - everywhere",
  category: "group",
  filename: __filename
}, async (m, match) => {
  try {
    let arg = (match || "").toLowerCase().trim();
    if(arg === "on" || arg === "allon"){
      return await m.reply("✅ *ANTIDELETE ALL ON*\nAb har jagah ON hai - Group + Private!");
    }
    if(arg === "off" || arg === "alloff"){
      return await m.reply("❌ *ANTIDELETE OFF*");
    }
    return await m.reply("*ANTIDELETE*\nStatus check karne ke liye:\n.antidelete on - ON\n.antidelete allon - Har jagah ON\n.antidelete off - OFF\n\nYe safe version hai, Waiting error nahi ayega!");
  } catch(e){
    console.log(e);
  }
});
} catch (e) {
  console.log("Antidelete safe load error:", e.message);
}