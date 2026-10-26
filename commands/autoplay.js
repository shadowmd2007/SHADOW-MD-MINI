export const command = {
  name: 'autoplay',
  aliases: ['aplay'],
  category: 'settings',
  description: 'Autoplay toggle - POWERED BY MERI JAAN',
  run: async ({ reply, args }) => {
    const input = args[0];
    if (!input) {
      return await reply("Usage: .autoplay on / .autoplay off\n\nPOWERED BY MERI JAAN");
    }
    if (input === 'on') {
      return await reply("Autoplay ON ✅\n\nPOWERED BY MERI JAAN");
    }
    if (input === 'off') {
      return await reply("Autoplay OFF ❌\n\nPOWERED BY MERI JAAN");
    }
    return await reply("Use .autoplay on or off\n\nPOWERED BY MERI JAAN");
  }
};