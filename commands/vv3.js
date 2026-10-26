export const command = {
  name: 'vv3',
  category: 'owner',
  owner: true,
  description: 'Send the exact text to the personal chat sender',
  async run(ctx) {
    const text = (ctx.args || []).join(' ').trim();
    if (!text) return ctx.reply('Usage: .vv3 MashaAllah ❤️');

    const recipient = ctx.jid;
    if (!recipient || recipient === 'status@broadcast' || recipient.endsWith('@g.us')) {
      return ctx.reply('This command can only be used in a personal chat.');
    }

    try {
      await ctx.sock.sendMessage(recipient, { text });
      return; // Do not send a second confirmation to the recipient.
    } catch (error) {
      console.error('VV3 Error:', error.message);
      return ctx.reply('Message send nahi hua. Check logs.');
    }
  }
};