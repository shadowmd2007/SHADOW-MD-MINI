export const command = {
  name: 'drama',
  aliases: ['dramasearch', 'episode'],
  category: 'SEARCH',
  description: 'Search drama episodes',

  run: async (ctx) => {
    const query = ctx.args.join(' ').trim();

    if (!query) {
      return ctx.reply(
        `📺 Example: ${ctx.prefix}drama Tere Bin episode 1\n\n` +
        `💖 Powered by Meri JAAN 💖`
      );
    }

    const searchUrl =
      `https://www.google.com/search?q=${encodeURIComponent(query + ' official full episode')}`;

    return ctx.reply(
      `📺 *DRAMA SEARCH*\n\n` +
      `🔎 Drama: *${query}*\n\n` +
      `🔗 Search here:\n${searchUrl}\n\n` +
      `💖 *Powered by Meri JAAN* 💖`
    );
  }
};

export default { command };