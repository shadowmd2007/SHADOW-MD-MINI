export const command = {
  name: 'play',
  aliases: ['song', 'mp3', 'yta', 'ytmp3', 'audio'],
  category: 'DOWNLOADER',
  description: 'Search and send audio',
  run: async (ctx) => {
    const query = ctx.args.join(' ').trim();

    if (!query) {
      return ctx.reply(`🎧 Example: ${ctx.prefix}play Atif Aslam song`);
    }

    await ctx.reply(`🔎 Searching audio: *${query}*`);

    const searchApis = [
      `https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`
    ];

    let videoUrl = '';
    let title = query;

    for (const api of searchApis) {
      try {
        const r = await fetch(api, { signal: AbortSignal.timeout(12000) });
        if (!r.ok) continue;
        const j = await r.json();
        const list = Array.isArray(j.result) ? j.result
          : Array.isArray(j.results) ? j.results
          : Array.isArray(j.data) ? j.data : [];

        const item = list.find(x => x && (x.url || x.videoUrl || x.link));
        if (item) {
          videoUrl = item.url || item.videoUrl || item.link;
          title = item.title || item.name || query;
          break;
        }
      } catch {}
    }

    if (!videoUrl) {
      return ctx.reply('❌ Song search API se result nahi mila. Service baad mein try karein.');
    }

    const downloadApis = [
      `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
      `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`
    ];

    let audioUrl = '';

    function findUrl(v, depth = 0) {
      if (!v || depth > 5) return '';
      if (typeof v === 'string') return /^https?:\/\//i.test(v) ? v : '';
      if (Array.isArray(v)) {
        for (const x of v) {
          const found = findUrl(x, depth + 1);
          if (found) return found;
        }
      } else if (typeof v === 'object') {
        for (const k of ['downloadUrl', 'download_url', 'url', 'download', 'audio', 'link']) {
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

    for (const api of downloadApis) {
      try {
        const r = await fetch(api, { signal: AbortSignal.timeout(15000) });
        if (!r.ok) continue;
        const j = await r.json();
        audioUrl = findUrl(j);
        if (audioUrl) break;
      } catch {}
    }

    if (!audioUrl) {
      return ctx.reply('❌ Song mila, lekin audio download service ne link nahi diya.');
    }

    try {
      await ctx.sock.sendMessage(ctx.jid, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title.replace(/[\\/:*?"<>|]/g, '_')}.mp3`
      }, { quoted: ctx.m });
    } catch {
      return ctx.reply('❌ Audio send nahi hua. Download link expire ya unavailable ho sakta hai.');
    }
  }
};

export default { command };