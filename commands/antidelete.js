try{
cmd({
  pattern: "antidelete",
  alias: ["ad"],
  desc: "Antidelete",
  category: "group",
  filename: __filename
}, async (m, match) => {
  return await m.reply(`✅ *Antidelete Working!*\n\n.antidelete on - ON\n.antidelete off - OFF\n.antidelete allon - Har Jagah ON`);
});
}catch(e){ console.log(e) }