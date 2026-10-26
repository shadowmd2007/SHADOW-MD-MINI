export const command = {
  name: 'play',
  aliases: ['song', 'mp3', 'yta', 'music'],
  category: 'DOWNLOADER',
  description: 'Download song',

  run: async (ctx) => {
    const query = ctx.args.join(' ');
    const { sock, jid, m } = ctx;

    if (!query) {
      return await ctx.reply(`*Example:* ${ctx.prefix}play Pasoori`);
    }

    try {
      await sock.sendMessage(jid, { react: { text: '🎵', key: m.key } });
      
      // Searching message - ENGLISH
      await ctx.reply(`⏳ *Searching for "${query}"...*\n\n_Please wait Meri JAAN is finding your song_ 🎵`);

      let videoUrl = '';
      let title = query;
      let thumbnail = '';
      let channel = '';

      try {
        let r1 = await fetch(`https://apis.davidcyriltech.my.id/youtube/search?query=${encodeURIComponent(query)}`);
        let j1 = await r1.json();
        if (j1?.result?.[0]?.url) {
          videoUrl = j1.result[0].url;
          title = j1.result[0].title;
          thumbnail = j1.result[0].thumbnail;
          channel = j1.result[0].author || '';
        }
      } catch {}

      if (!videoUrl) {
        return await ctx.reply(`❌ *Song "${query}" not found.*`);
      }

      let audioUrl = '';
      try {
        let d1 = await fetch(`https://apis.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl)}`);
        let jd1 = await d1.json();
        audioUrl = jd1?.result?.downloadUrl || jd1?.result?.download_url || jd1?.result?.url;
      } catch {}

      if (!audioUrl) {
        try {
          let d2 = await fetch(`https://api.vreden.my.id/api/ytmp3?url=${encodeURIComponent(videoUrl)}`);
          let jd2 = await d2.json();
          audioUrl = jd2?.result?.download || jd2?.result?.url;
        } catch {}
      }

      if (!audioUrl) throw new Error('API failed');

      const caption = `╭───❀ 🌹 ❀───╮
   🌹 𝐒𝐎𝐍𝐆 𝐅𝐎𝐔𝐍𝐃 🌹
╰───❀ 🌹 ❀───╯

*🎵 Title:* ${title}
*📺 Channel:* ${channel}
*🔗 Link:* ${videoUrl}

*🎧 Sending audio now... Please wait.*

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯
`;

      await sock.sendMessage(jid, {
        image: { url: thumbnail || 'https://files.catbox.moe/y04tbj.jpg' },
        caption: caption
      }, { quoted: m });

      await sock.sendMessage(jid, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: m });

      await sock.sendMessage(jid, { react: { text: '✅', key: m.key } });

    } catch (e) {
      console.log('play error:', e);
      await ctx.reply(`❌ *Failed to download song. Please try again after 2 minutes.*\n\n╭───❀ 🌹 ❀───╮\n   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹\n   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖\n╰───❀ 🌹 ❀───╯`);
    }
  }
};