
export const command = {
  name: 'autoreact',
  aliases: ['reactauto'],
  category: 'OWNER',
  description: 'Enable or disable automatic reactions',

  run: async (ctx) => {
    const action = (ctx.args[0] || '').toLowerCase();

    const owner =
      process.env.OWNER_NUMBER ||
      ctx.config?.ownerNumber ||
      ctx.config?.owner;

    const ownerJid = owner
      ? (owner.includes('@')
          ? owner
          : `${owner.replace(/\D/g, '')}@s.whatsapp.net`)
      : null;

    const sender = ctx.senderJid || ctx.sender || ctx.jid;

    if (!ownerJid || sender !== ownerJid) {
      return ctx.reply(
        '❌ Sirf bot owner yeh setting change kar sakta hai.\n\n🌹 Powered by Meri JAAN'
      );
    }

    if (!['on', 'off'].includes(action)) {
      return ctx.reply(
        `🤖 *AUTOREACT SETTINGS*\n\n` +
        `• ${ctx.prefix}autoreact on\n` +
        `• ${ctx.prefix}autoreact off\n\n` +
        `🌹 Powered by Meri JAAN`
      );
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const dir = path.dirname(fileURLToPath(import.meta.url));
    const file = path.join(dir, '..', 'handler-settings.json');

    let data = {};

    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}

    data.autoreact = action === 'on';

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    return ctx.reply(
      `🤖 *AUTOREACT ${action.toUpperCase()}* ${action === 'on' ? '✅' : '❌'}\n\n` +
      `🌹 Powered by Meri JAAN`
    );
  }
};

export default { command };
