export const command = {
  name: 'vv3',
  category: 'owner',
  owner: true,
  description: 'Send an ordinary text reply to the sender',
  async run(ctx) {
    const text = (ctx.args || []).join(' ').trim();
    if (!text) return ctx.reply('❌ Message likho.\nExample: .vv3 Hello ❤️');

    const sender = ctx.senderJid || ctx.jid;
    if (!sender || sender === 'status@broadcast' || sender.endsWith('@g.us')) {
      return ctx.reply('❌ Personal chat mein sender ko reply karo.');
    }

    try {
      await ctx.sock.sendMessage(sender, {
        text: `💌 *${ctx.settings?.botName || 'SHADOW MD'}*\n\n${text}`
      });
      return ctx.reply('✅ Sender ko text message bhej diya.');
    } catch (error) {
      console.error('VV3 Error:', error.message);
      return ctx.reply('❌ Message send nahi hua.');
    }
  }
};