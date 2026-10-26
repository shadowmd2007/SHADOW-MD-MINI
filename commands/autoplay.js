export const command = {
  name: 'autoplay',
  aliases: ['aplay', 'auto-play'],
  category: 'settings',
  description: 'Toggle autoplay',
  run: async ({ sock, jid, m, args, reply }) => {
    try {
      const input = args[0]?.toLowerCase();
      
      if (!input || (input !== 'on' && input !== 'off')) {
        return await reply(
`╭━━━━━━━━━━━━━━━━━━━╮
┃  🌹 𝐑𝐀𝐍𝐀 𝐅𝐔𝐑𝐐𝐀𝐍 𝐌𝐃 🌹  ┃
╰━━━━━━━━━━━━━━━━━━━╯

*Autoplay Settings*

Usage:
.autoplay on - Enable Autoplay
.autoplay off - Disable Autoplay

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃