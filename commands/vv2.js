
const allowedWords = new Set([
  'mashaallah', 'mashallah', 'nice', 'cute', 'wah', 'best', 'behtreen',
  'behtarin', 'ok', 'okay', 'beautiful', 'good', 'wow', 'lovely',
  'amazing', 'excellent', 'zabardast', 'subhanallah', 'super', 'awesome'
]);

export const command = {
  name: 'vv2',
  aliases: ['vv'],
  category: 'owner',
  owner: true,
  description: 'Send the approved word or phrase to the owner personal chat',
  async run(ctx) {
    const owner = String(process.env.OWNER_NUMBER || ctx.settings?.ownerNumber || '')
      .split(',')[0].replace(/\D/g, '');
    if (!owner) return ctx.reply('Set OWNER_NUMBER in Railway/Render Variables first.');

    const text = (ctx.args || []).join(' ').trim();
    if (!text) return ctx.reply('Usage: .vv2 MashaAllah ❤️');

    // Allow only the requested words; emoji and punctuation are preserved in the sent text.
    const words = text.toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(/\s+/).filter(Boolean);
    if (!words.length || words.some(word => !allowedWords.has(word))) {
      return ctx.reply('Allowed words: MashaAllah, mashallah, nice, cute, wah, best, behtreen, behtarin, ok, okay, beautiful, good, wow, lovely, amazing, excellent, zabardast, subhanallah, super, awesome');
    }

    try {
      await ctx.sock.sendMessage(`${owner}@s.whatsapp.net`, { text });
      return ctx.reply('Sent to owner personal WhatsApp.');
    } catch (error) {
      console.error('VV2 Error:', error.message);
      return ctx.reply('Message send nahi hua. Check logs and OWNER_NUMBER.');
    }
  }
};
