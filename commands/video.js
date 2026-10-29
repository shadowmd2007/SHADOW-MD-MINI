export const command = {
  name: 'video',
  aliases: ['ytv', 'ytmp4'],
  category: 'DOWNLOADER',
  description: 'Download video',
  run: async (ctx) => {
    const query = ctx.args.join(' ');
    const { sock, jid, m } = ctx;
    if (!query) return await ctx.reply(`*Example:* ${ctx.prefix}video Pasoori`);
    try {
      await sock.sendMessage(jid, { react: { text: '🎬', key: m.key } });
      await ctx.reply(`🔍 *"${query}"* search...`);
      let videoUrl = '', title = query, thumbnail = '', channel = '';
      try {
        let r1 = await fetch(`https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`);
        let j1 = await r1.json();
        if (j1?.result?.[0]?.url) { videoUrl = j1.result[0].url; title = j1.result[0].title; thumbnail = j1.result[0].thumbnail; channel = j1.result[0].author || ''; }
      } catch {}
      if (!videoUrl) return await ctx.reply(`❌ *Video not found.*`);
      if (thumbnail) {
        try {
          await sock.sendMessage(jid, { image: { url: thumbnail }, caption: `*🎬 ${title}*\n*📺 ${channel}*\n\n📥 Video bhej raha hun...` }, { quoted: m });
        } catch {}
      }
      let videoDownloadUrl = '';
      const apis = [
        `https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(videoUrl)}`,
        `https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(videoUrl)}`,
        `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${encodeURIComponent(videoUrl)}`
      ];
      for(const api of apis){
        try{ let r = await fetch(api); let j = await r.json(); let url = j?.result?.downloadUrl || j?.result?.url || j?.result?.download || j?.url; if(url){ videoDownloadUrl = url; break; } }catch{}
      }
      if (!videoDownloadUrl) throw new Error('All APIs failed');
      const caption = `*🎬 Title:* ${title}\n*📺 Channel:* ${channel}\n\n🌹 *Meri JAAN* 💖`;
      await sock.sendMessage(jid, { video: { url: videoDownloadUrl }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (e) { await ctx.reply(`❌ *Failed.* Try again: ${e.message}\nMeri JAAN 🌹`); }
  }
};