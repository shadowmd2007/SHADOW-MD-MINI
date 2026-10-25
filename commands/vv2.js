const triggers = [
  'mashaallah', 'mashallah', 'nice', 'cute', 'wah', 'best', 'behtreen',
  'behtarin', 'ok', 'okay', 'beautiful', 'good', 'wow', 'lovely',
  'amazing', 'excellent', 'zabardast', 'subhanallah', 'super', 'awesome',
  'handsome', 'sweet', 'so cute', 'very nice', 'great', 'perfect',
  'outstanding', 'khoobsurat', 'pyara', 'pyari', 'wah wah',
  '💗', '💔', '🌹', '😘', '❣️', '💘', '🙂', '❤️', '😍', '🥰',
  '💕', '💖', '✨', '🔥', '👍', '❤️‍🔥', '💞', '💓', '🌸', '🫶'
];

export const command = {
  name: 'vv2',
  aliases: ['vv'],
  category: 'owner',
  owner: true,
  description: 'Send a text to the configured owner WhatsApp',

  async run(ctx) {
    const owner = String(
      process.env.OWNER_NUMBER || ctx.settings?.ownerNumber || ''
    )
      .replace(/\D/g, '')
      .split(',')[0];

    if (!owner)
      return ctx.reply('❌ Railway Variables mein OWNER_NUMBER set karo.');

    const text = (ctx.args || []).join(' ').trim();

    if (!text) {
      return ctx.reply(
        'Example: .vv2 MashaAllah ❤️\nAvailable words: ' +
        triggers.slice(0, 20).join(', ')
      );
    }

    try {
      await ctx.sock.sendMessage(`${owner}@s.whatsapp.net`, {
        text: `📩 *${ctx.settings?.botName || 'SHADOW MD'}*\n\n${text}`
      });

      return ctx.reply('✅ Personal WhatsApp par text bhej diya.');
    } catch (error) {
      console.error('VV2 Error:', error.message);
      return ctx.reply('❌ Message send nahi hua.');
    }
  }
};