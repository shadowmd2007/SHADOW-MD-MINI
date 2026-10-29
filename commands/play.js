export const command = {
  name: 'play',
  aliases: ['song', 'yta', 'ytmp3', 'mp3'],
  category: 'DOWNLOADER',
  description: 'Download audio/song',
  run: async (ctx) => {
    const query = ctx.args.join(' ');
    const { sock, jid, m } = ctx;
    if (!query) return await ctx.reply(`*Example:* ${ctx.prefix}play Pasoori`);
    try {
      await sock.sendMessage(jid, { react: { text: '🎧', key: m.key } });
      await ctx.reply(`⏳ *Searching song for "${query}"...*`);
      let videoUrl = '', title = query, thumbnail = '', channel = '';
      try {
        let r1 = await fetch(`https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`);
        let j1 = await r1.json();
        if (j1?.result?.[0]?.url) { videoUrl = j1.result[0].url; title = j1.result[0].title; thumbnail = j1.result[0].thumbnail; channel = j1.result[0].author || ''; }
      } catch {}
      if (!videoUrl) return await ctx.reply(`❌ *Song not found.*`);
      
      // PEHLE PICTURE BHEJO
      if (thumbnail) {
        try {
          const thumbCaption = `╭───❀ 🌹 ❀───╮\n   🌹 𝐒𝐎𝐍𝐆 𝐅𝐎𝐔𝐍𝐃 🌹\n╰───❀ 🌹 ❀───╯\n\n*🎧 Title:* ${title}\n*📺 Channel:* ${channel}\n\n*📥 Sending audio now...*\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`;
          await sock.sendMessage(jid, { image: { url: thumbnail }, caption: thumbCaption }, { quoted: m });
        } catch {}
      }

      let audioDownloadUrl = '';
      try {
        let d1 = await fetch(`https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`);
        let jd1 = await d1.json();
        audioDownloadUrl = jd1?.result?.downloadUrl || jd1?.result?.url || jd1?.result?.download;
      } catch {}
      if (!audioDownloadUrl) {
        try {
          let d2 = await fetch(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`);
          let jd2 = await d2.json();
          audioDownloadUrl = jd2?.result?.download || jd2?.result?.url;
        } catch {}
      }
      if (!audioDownloadUrl) throw new Error('API failed');
      
      const caption = `╭───❀ 🌹 ❀───╮\n   🌹 𝐒𝐎𝐍𝐆 𝐅𝐎𝐔𝐍𝐃 🌹\n╰───❀ 🌹 ❀───╯\n\n*🎧 Title:* ${title}\n*📺 Channel:* ${channel}\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`;
      
      await sock.sendMessage(jid, { audio: { url: audioDownloadUrl }, mimetype: 'audio/mpeg', fileName: `${title}.mp3`, ptt: false }, { quoted: m });
      await sock.sendMessage(jid, { text: caption }, { quoted: m });
      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });
    } catch (e) { await ctx.reply(`❌ *Failed to download song.*\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`); }
  }
};