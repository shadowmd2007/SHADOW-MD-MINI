
export const command = {
  name: 'antilink',
  aliases: ['antilinks'],
  category: 'GROUP',
  description: 'Enable or disable anti-link protection',

  run: async (ctx) => {
    const action = (ctx.args[0] || '').toLowerCase();

    if (!ctx.isGroup) {
      return ctx.reply('❌ Yeh command sirf groups mein chalegi.\n\n🌹 Powered by Meri JAAN');
    }

    if (!['on', 'off'].includes(action)) {
      return ctx.reply(
        `🔗 *ANTI-LINK SETTINGS*\n\n` +
        `• ${ctx.prefix}antilink on\n` +
        `• ${ctx.prefix}antilink off\n\n` +
        `🌹 Powered by Meri JAAN`
      );
    }

    if (!ctx.isOwner) {
      const metadata = await ctx.sock.groupMetadata(ctx.jid);
      const participant = metadata.participants.find(
        p => p.id === ctx.senderJid || p.jid === ctx.senderJid
      );

      const isAdmin = participant?.admin === 'admin' ||
                      participant?.admin === 'superadmin';

      if (!isAdmin) {
        return ctx.reply('❌ Sirf group admin ya bot owner setting change kar sakta hai.\n\n🌹 Powered by Meri JAAN');
      }
    }

    const fs = await import('fs');
    const path = await import('path');
    const { fileURLToPath } = await import('url');

    const dir = path.dirname(fileURLToPath(import.meta.url));
    const file = path.join(dir, '..', 'antilink-settings.json');

    let data = {};

    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch {}

    data[ctx.jid] = action === 'on';

    fs.writeFileSync(file, JSON.stringify(data, null, 2));

    return ctx.reply(
      `🔗 *ANTI-LINK ${action.toUpperCase()}* ${action === 'on' ? '✅' : '❌'}\n\n` +
      `🌹 Powered by Meri JAAN`
    );
  }
};

export default { command };
