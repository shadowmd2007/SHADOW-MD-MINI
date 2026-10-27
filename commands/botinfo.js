export const command = {
  name: "botinfo",
  aliases: ["info", "bot"],
  run: async ({ sock, jid, m, prefix }) => {
    const text = `
┏━━━━━━━━━━━━━━━━━━━━┓
┃ 🌹 RANA FURQAN MD 🌹 ┃
┗━━━━━━━━━━━━━━━━━━━━┛

🌹 VERSION : 5.0.0
🌹 MODE : PUBLIC  
🌹 PREFIX : ${prefix}
🌹 COMMANDS : ${global.commands ? global.commands.size : 109}
🌹 OWNER : RANA KI JAAN

🌹 POWERED BY MERI JAAN 🌹
`;
    await sock.sendMessage(jid, { text }, { quoted: m });
  }
}