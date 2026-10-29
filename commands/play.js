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
        let r1 = await fetch(`https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`);
        let j1 = await r1.json();
        if (j1?.result?.[0]?.url) {
          videoUrl = j1.result[0].url;
          title = j1.result[0].title;
          thumbnail = j1.result[0].thumbnail;
          channel = j1.result[0].author || j1.result[0].channel || '';
        }
      } catch {}

      if (!videoUrl) return await ctx.reply(`❌ *Song not found.*`);

      // 1. PEHLE PICTURE
      if (thumbnail) {
        try {
          await sock.sendMessage(jid, {
            image: { url: thumbnail },
            caption: `*🎧 ${title}*\n*📺 ${channel}*\n\n📥 *Direct audio bhej raha hun...*\n🌹 Meri JAAN`
          }, { quoted: m });
        } catch {}
      }

      // 2. DIRECT AUDIO DOWNLOAD - 3 API FALLBACK
      let audioUrl = '';
      const apis = [
        `https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        `https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`,
        `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(videoUrl)}`
      ];

      for (const api of apis) {
        try {
          let r = await fetch(api);
          let j = await r.json();
          let url = j?.result?.downloadUrl || j?.result?.url || j?.result?.download || j?.url;
          if (url) { audioUrl = url; break; }
        } catch {}
      }

      if (!audioUrl) throw new Error('All APIs failed');

      // 3. DIRECT AUDIO BHEJO
      await sock.sendMessage(jid, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`
      }, { quoted: m });

      await sock.sendMessage(jid, {
        text: `*✅ ${title}*\n*📺 ${channel}*\n\n╭───❀ 🌹 ❀───╮\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`
      }, { quoted: m });

      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });

    } catch (e) {
      await ctx.reply(`❌ *Failed to download.*\n${e.message}\n\n🌹 Meri JAAN`);
    }
  }
};