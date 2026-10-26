export const command = {
  name: 'play',
  aliases: ['song', 'mp3', 'ytaudio', 'playmp3'],
  category: 'DOWNLOADER',
  description: 'Download song from YouTube',

  run: async (ctx) => {
    const query = ctx.args.join(' ');
    const { sock, jid, m } = ctx;

    if (!query) {
      return await ctx.reply(
`╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐋𝐀𝐘 𝐒𝐎𝐍𝐆 🌹
╰───❀ 🌹 ❀───╯

*Use:* ${ctx.prefix || '.'}play <song name>

*Example:*
  ◦ ${ctx.prefix || '.'}play Tere Bin
  ◦ ${ctx.prefix || '.'}play Pasoori
  ◦ ${ctx.prefix || '.'}play Jhol`
      );
    }

    try {
      await ctx.reply(`⏳ *Meri JAAN "${query}" dhoond rahi hun...* 🌹🎵`);

      // --- YOUTUBE SEARCH + DOWNLOAD API 1 ---
      let api = `https://api.nexoracle.com/youtube/search?query=${encodeURIComponent(query)}`;
      let res = await fetch(api);
      let data = await res.json();

      let videoUrl = '';
      let title = query;
      let thumbnail = '';

      if (data && data.result && data.result.length > 0) {
        videoUrl = data.result[0].url;
        title = data.result[0].title;
        thumbnail = data.result[0].thumbnail;
      } else {
        // Agar search fail ho to direct query ko hi use karo
        videoUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      }

      // --- MP3 DOWNLOAD API ---
      const dlApi = `https://api.davidcyriltech.my.id/download/ytmp3?url=${encodeURIComponent(videoUrl || query)}`;
      const dlRes = await fetch(dlApi);
      const dlData = await dlRes.json();

      let audioUrl = dlData?.result?.downloadUrl || dlData?.result?.url || dlData?.url;

      // --- BACKUP API 2 ---
      if (!audioUrl) {
        const backupApi = `https://api.nexoracle.com/youtube/audio?url=${encodeURIComponent(videoUrl)}`;
        const bRes = await fetch(backupApi);
        const bData = await bRes.json();
        audioUrl = bData?.result?.audio || bData?.result?.url;
        title = bData?.result?.title || title;
        thumbnail = bData?.result?.thumbnail || thumbnail;
      }

      if (!audioUrl) throw new Error('No audio URL');

      // --- SEND WITH THUMBNAIL ---
      await sock.sendMessage(jid, {
        image: { url: thumbnail || ctx.config?.menuImage },
        caption: `╭───❀ 🌹 ❀───╮
   🌹 𝐒𝐎𝐍𝐆 𝐅𝐎𝐔𝐍𝐃 🌹
╰───❀ 🌹 ❀───╯

*🎵 Title:* ${title}
*🎧 Requested:* ${query}

> _Audio bheja ja raha hai..._

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯
`
      }, { quoted: m });

      // --- SEND MP3 ---
      await sock.sendMessage(jid, {
        audio: { url: audioUrl },
        mimetype: 'audio/mpeg',
        fileName: `${title}.mp3`,
        ptt: false
      }, { quoted: m });

      // --- SEND AS DOCUMENT ALSO FOR BEST QUALITY ---
      // await sock.sendMessage(jid, {
      //   document: { url: audioUrl },
      //   mimetype: 'audio/mpeg',
      //   fileName: `${title}.mp3`
      // }, { quoted: m });

    } catch (e) {
      console.log('play.js error:', e);
      await ctx.reply(`❌ Meri JAAN "${query}" nahi mila 🌹\n\n*Tip:* Koi aur naam se try karo, jaise "Pasoori song"`);
    }
  }
};