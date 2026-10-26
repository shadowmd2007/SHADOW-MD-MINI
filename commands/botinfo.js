export const command = {
  name: "botinfo",
  run: async ({ sock, jid, m, prefix }) => {
    const text = `
┏━━━━━━━━━━━━━━━━━━━━┓
┃ 🌹 RANA FURQAN MD 🌹 ┃
┗━━━━━━━━━━━━━━━━━━━━┛

🌹 VERSION : 5.0.0
🌹 MODE : PUBLIC  
🌹 PREFIX : ${prefix}
🌹 COMMANDS : ${global.commands.size}
🌹 OWNER : RANA KI JAAN

🌹 POWERED BY MERI JAAN 🌹
`;
    await sock.sendMessage(jid, { text }, { quoted: m });
  }
}