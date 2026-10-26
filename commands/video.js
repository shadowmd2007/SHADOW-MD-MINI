export const command = {
  name: 'video',
  aliases: ['fb', 'tiktok', 'insta', 'ytvideo'],
  category: 'DOWNLOADER',
  description: 'Download any video - FB, TikTok, IG, YT',

  run: async (ctx) => {
    const url = ctx.args[0];
    const { sock, jid, m } = ctx;

    if (!url) {
      return await ctx.reply(
`╭───❀ 🌹 ❀───╮
   🌹 𝐕𝐈𝐃𝐄𝐎 𝐃𝐎𝐖𝐍𝐋𝐎𝐀𝐃𝐄𝐑 🌹
╰───❀ 🌹 ❀───╯

*Use:* ${ctx.prefix || '.'}video <link>

*Supported:*
  ◦ Facebook
  ◦ TikTok
  ◦ Instagram
  ◦ YouTube

*Example:*
  ◦ ${ctx.prefix || '.'}video https://fb.watch/xyz
  ◦ ${ctx.prefix || '.'}video https://vt.tiktok.com/xyz`
      );
    }

    if (!url.startsWith('http')) {
      return await ctx.reply('❌ Meri JAAN sahi link bhejo 🌹');
    }

    try {
      await ctx.reply('⏳ *Meri JAAN video download ho rahi hai...* 🌹');

      // --- FREE ALL-IN-ONE API ---
      const api = `https://api.nexoracle.com/downloader/all?url=${encodeURIComponent(url)}`;
      const res = await fetch(api);
      const data = await res.json();

      if (!data || !data.result || !data.result.url) {
        throw new Error('API failed');
      }

      const videoUrl = data.result.url;
      const title = data.result.title || 'RANA FURQAN MD Video';

      await sock.sendMessage(jid, {
        video: { url: videoUrl },
        caption: `╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯

*Title:* ${title}

> Downloaded by ${ctx.config?.botName || 'RANA FURQAN MD'}`,
        mimetype: 'video/mp4'
      }, { quoted: m });

    } catch (e) {
      console.log('video.js error:', e);
      // --- BACKUP API ---
      try {
        const backupApi = `https://api.davidcyriltech.my.id/download/all?url=${encodeURIComponent(url)}`;
        const res2 = await fetch(backupApi);
        const data2 = await res2.json();
        
        if (data2 && data2.result && data2.result.video) {
          await sock.sendMessage(jid, {
            video: { url: data2.result.video },
            caption: `🌹💖 Powered by Meri JAAN 💖🌹`,
            mimetype: 'video/mp4'
          }, { quoted: m });
          return;
        }
        throw new Error('backup failed');
      } catch (err) {
        await ctx.reply(`❌ Meri JAAN video download nahi ho saki 🌹\n\n*Error:* Link sahi nahi hai ya private video hai.`);
      }
    }
  }
};