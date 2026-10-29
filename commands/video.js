export const command = {
  name: 'video',
  aliases: ['ytv', 'ytmp4'],
  category: 'DOWNLOADER',
  description: 'Search and send video',
  run: async (ctx) => {
    const query = ctx.args.join(' ').trim();

    if (!query) {
      return ctx.reply(`🎬 Example: ${ctx.prefix}video cricket highlights`);
    }

    await ctx.reply(`🔎 Searching video: *${query}*`);

    let videoPage = '';
    let title = query;

    try {
      const r = await fetch(
        `https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`,
        { signal: AbortSignal.timeout(12000) }
      );

      if (r.ok) {
        const j = await r.json();
        const list = Array.isArray(j.result) ? j.result
          : Array.isArray(j.results) ? j.results
          : Array.isArray(j.data) ? j.data : [];
        const item = list.find(x => x && (x.url || x.videoUrl || x.link));

        if (item) {
          videoPage = item.url || item.videoUrl || item.link;
          title = item.title || item.name || query;
        }
      }
    } catch {}

    if (!videoPage) {
      return ctx.reply('❌ Video search service se result nahi mila.');
    }

    const apis = [
      `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(videoPage)}`,
      `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(videoPage)}`
    ];

    function findUrl(v, depth = 0) {
      if (!v || depth > 5) return '';
      if (typeof v === 'string') return /^https?:\/\//i.test(v) ? v : '';
      if (Array.isArray(v)) {
        for (const x of v) {
          const found = findUrl(x, depth + 1);
          if (found) return found;
        }
      } else if (typeof v === 'object') {
        for (const k of ['downloadUrl', 'download_url', 'url', 'download', 'video', 'link']) {
          const found = findUrl(v[k], depth + 1);
          if (found) return found;
        }
        for (const val of Object.values(v)) {
          const found = findUrl(val, depth + 1);
          if (found) return found;
        }
      }
      return '';
    }

    let videoUrl = '';

    for (const api of apis) {
      try {
        const r = await fetch(api, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) continue;
        videoUrl = findUrl(await r.json());
        if (videoUrl) break;
      } catch {}
    }

    if (!videoUrl) {
      return ctx.reply('❌ Video result mila, lekin download service ne link nahi diya.');
    }

    try {
      await ctx.sock.sendMessage(ctx.jid, {
        video: { url: videoUrl },
        mimetype: 'video/mp4',
        fileName: `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp4`,
        caption: `🎬 *${title}*\n\n💖 SHADOW MD`
      }, { quoted: ctx.m });
    } catch {
      return ctx.reply('❌ Video send nahi hui. File size ya download link ka issue ho sakta hai.');
    }
  }
};

export default { command };