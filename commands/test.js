export const command = {
  name: "test",
  aliases: ["t"], // optional
  run: async ({ sock, jid, m, args, isGroup, reply }) => {
    // Ye sab jagah chalega - personal aur group
    await reply(`✅ Ye command kaam kar rahi hai!\n\nChat: ${isGroup ? 'Group' : 'Personal'}\nArgs: ${args.join(' ') || 'koi nahi'}\n\n🌹 POWERED BY MERI JAAN 🌹`);
  }
}