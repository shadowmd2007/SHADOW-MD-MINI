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
      await ctx.reply(`⏳ *Searching video for "${query}"...*`);
      let videoUrl = '', title = query, thumbnail = '', channel = '';
      try {
        let r1 = await fetch(`https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`);
        let j1 = await r1.json();
        if (j1?.result?.[0]?.url) { videoUrl = j1.result[0].url; title = j1.result[0].title; thumbnail = j1.result[0].thumbnail; channel = j1.result[0].author || ''; }
      } catch {}
      if (!videoUrl) return await ctx.reply(`❌ *Video not found.*`);
      let videoDownloadUrl = '';
      try {
        let d1 = await fetch(`https://apis.davidcyriltech.my.id/download/ytmp4?url=${encodeURIComponent(videoUrl)}`);
        let jd1 = await d1.json();
        videoDownloadUrl = jd1?.result?.downloadUrl || jd1?.result?.url;
      } catch {}
      if (!videoDownloadUrl) {
        try {
          let d2 = await fetch(`https://api.vreden.my.id/api/ytmp4?url=${encodeURIComponent(videoUrl)}`);
          let jd2 = await d2.json();
          videoDownloadUrl = jd2?.result?.download || jd2?.result?.url;
        } catch {}
      }
      if (!videoDownloadUrl) throw new Error('API failed');
      const caption = `╭───❀ 🌹 ❀───╮\n   🌹 𝐕𝐈𝐃𝐄𝐎 𝐅𝐎𝐔𝐍𝐃 🌹\n╰───❀ 🌹 ❀───╯\n\n*🎬 Title:* ${title}\n*📺 Channel:* ${channel}\n*🔗 Link:* ${videoUrl}\n\n*📥 Sending video now...*\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`;
      await sock.sendMessage(jid, { video: { url: videoDownloadUrl }, mimetype: 'video/mp4', fileName: `${title}.mp4`, caption: caption }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (e) { await ctx.reply(`❌ *Failed to download video.*\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`); }
  }
};