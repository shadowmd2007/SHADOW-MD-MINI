
export const command = {
  name: 'autostatus',
  aliases: ['astatus'],
  category: 'OWNER',
  description: 'Auto status setting',

  run: async (ctx) => {
    const owner =
      process.env.OWNER_NUMBER ||
      ctx.config?.ownerNumber ||
      ctx.config?.owner;

    const sender = ctx.senderJid || ctx.sender || ctx.jid;
    const ownerJid = owner
      ? (owner.includes('@')
          ? owner
          : `${owner.replace(/\D/g, '')}@s.whatsapp.net`)
      : null;

    if (!ownerJid || sender !== ownerJid) {
      return ctx.reply('❌ Sirf bot owner is command ko use kar sakta hai.');
    }

    const action = (ctx.args[0] || '').toLowerCase();

    if (!['on', 'off'].includes(action)) {
      return ctx.reply(
        `📱 *AUTO STATUS*\n\n` +
        `• .autostatus on\n` +
        `• .autostatus off\n\n` +
        `💖 Powered by Meri JAAN`
      );
    }

    // Shared handler setting update
    ctx.settings.autostatus = action === 'on';

    return ctx.reply(
      `✅ AutoStatus: *${action.toUpperCase()}*\n\n` +
      `💖 Powered by Meri JAAN`
    );
  }
};

export default { command };
