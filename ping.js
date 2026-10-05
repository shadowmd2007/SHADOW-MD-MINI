module.exports = {
  command: ['ping'],
  description: "Bot speed check",
  category: "general",
  async execute(m, { sock }) {
    await sock.sendMessage(m.chat, { text: "*PONG! 🏓\nSHADOW-MD Active Hai ✓*" }, { quoted: m });
  }
}