export const command = {
  name: 'play',
  aliases: ['song', 'yta', 'ytmp3', 'mp3', 'audio'],
  category: 'DOWNLOADER',
  description: 'Download song direct audio',
  run: async (ctx) => {
    const query = ctx.args.join(' ');
    const { sock, jid, m } = ctx;
    if (!query) return await ctx.reply(`*Example:* ${ctx.prefix}play Pasoori`);
    try {
      await sock.sendMessage(jid, { react: { text: '🎧', key: m.key } });
      await ctx.reply(`🔍 *"${query}"* search...`);

      let videoUrl = '', title = query, thumbnail = '', channel = '';
      try {
        const r1 = await fetch(`https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`);
        if (!r1.ok) throw new Error(`Search API HTTP ${r1.status}`);
        const j1 = await r1.json();
        const list = Array.isArray(j1?.result) ? j1.result : Array.isArray(j1?.results) ? j1.results : Array.isArray(j1?.data) ? j1.data : [];
        const item = list.find(x => x && (x.url || x.videoUrl || x.link));
        if (item) {
          videoUrl = item.url || item.videoUrl || item.link;
          title = item.title || item.name || query;
          thumbnail = item.thumbnail || item.image || item.thumbnails?.[0]?.url || '';
          channel = item.author || item.channel || item.uploader || '';
        }
      } catch {}

      if (!videoUrl) return await ctx.reply('❌ Song search failed. Search API ne valid result nahi diya. Baad mein try karein.');

      if (thumbnail) {
        try {
          await sock.sendMessage(jid, {
            image: { url: thumbnail },
            caption: `*🎧 ${title}*\n*📺 ${channel}*\n\n📥 *Direct audio bhej raha hun...*`
          }, { quoted: m });
        } catch {}
      }

      let audioUrl = '';
      const apis = [
        `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`
      ];

      for (const api of apis) {
        try {
          const r = await fetch(api);
          if (!r.ok) continue;
          const j = await r.json();
          const findUrl = (v, depth = 0) => {
            if (!v || depth > 5) return '';
            if (typeof v === 'string') return /^https?:\/\//i.test(v) ? v : '';
            if (Array.isArray(v)) {
              for (const x of v) {
                const u = findUrl(x, depth + 1);
                if (u) return u;
              }
              return '';
            }
            if (typeof v === 'object') {
              for (const k of ['downloadUrl', 'download_url', 'url', 'download', 'audio', 'link']) {
                const u = findUrl(v[k], depth + 1);
                if (u) return u;
              }
              for (const val of Object.values(v)) {
                const u = findUrl(val, depth + 1);
                if (u) return u;
              }
            }
            return '';
          };
          const url = findUrl(j?.result || j?.data || j);
          if (url) {
            audioUrl = url;
            break;
          }
        } catch {}
      }

      if (!audioUrl) throw new Error('All APIs failed');

      await sock.sendMessage(jid, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: m });

      await sock.sendMessage(jid, {
        text: `*✅ ${title}*\n*📺 ${channel}*\n\n💖 *SHADOW MD* 💖`
      }, { quoted: m });

      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch {
      await ctx.reply('❌ Song download failed. Download service unavailable ya response badal gaya hai.');
    }
  }
};