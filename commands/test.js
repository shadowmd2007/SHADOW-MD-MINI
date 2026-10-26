export const command = {
  name: "test",
  run: async ({ reply, isGroup }) => {
    await reply(`✅ Test command working!\nChat type: ${isGroup ? 'Group' : 'Personal'}\n\n🌹 POWERED BY MERI JAAN 🌹`);
  }
}