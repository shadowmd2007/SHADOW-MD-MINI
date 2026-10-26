export const command = {
  name: 'song',
  category: 'DOWNLOADER',
  description: 'Download song',
  run: async (ctx) => {
    // Yahan tumhari API ka code
    const query = ctx.args.join(' ');
    if(!query) return ctx.reply('Gaane ka naam likho');
    
    // API call yahan
    const apiUrl = `https://tumhari-api.com/song?q=${query}`;
    // ... baaki code
  }
};