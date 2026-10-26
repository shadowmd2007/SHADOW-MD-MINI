export const command = {
  name: 'drama',
  aliases: ['dramas', 'pakdrama', 'drama-info'],
  category: 'SEARCH',
  description: 'Search any drama info',

  run: async (ctx) => {
    const query = ctx.args.join(' ');
    const { sock, jid, m } = ctx;

    if (!query) {
      return await ctx.reply(
`╭───❀ 🌹 ❀───╮
   🌹 𝐃𝐑𝐀𝐌𝐀 𝐒𝐄𝐀𝐑𝐂𝐇 🌹
╰───❀ 🌹 ❀───╯

*Use:* ${ctx.prefix || '.'}drama <name>

*Example:*
  ◦ ${ctx.prefix || '.'}drama Tere Bin
  ◦ ${ctx.prefix || '.'}drama Jaan Nisar
  ◦ ${ctx.prefix || '.'}drama Kabhi Main Kabhi Tum`
      );
    }

    try {
      await ctx.reply(`⏳ *Meri JAAN "${query}" search kar rahi hun...* 🌹`);

      // TVMaze API - Free & Fast for all dramas
      const api = `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(query)}`;
      const res = await fetch(api);
      const data = await res.json();

      if (!data || data.length === 0) {
        return await ctx.reply(`❌ Meri JAAN "${query}" nahi mila 🌹\nKoi aur naam try karo.`);
      }

      const drama = data[0].show;
      const title = drama.name || query;
      const rating = drama.rating?.average || 'N/A';
      const lang = drama.language || 'N/A';
      const genres = drama.genres?.join(', ') || 'Drama';
      const premiered = drama.premiered || 'N/A';
      const summary = drama.summary ? drama.summary.replace(/<[^>]*>/g, '').substring(0, 400) + '...' : 'No summary available';
      const image = drama.image?.original || drama.image?.medium || ctx.config?.menuImage;

      const caption = `╭───❀ 🌹 ❀───╮
   🌹 𝐃𝐑𝐀𝐌𝐀 𝐅𝐎𝐔𝐍𝐃 🌹
╰───❀ 🌹 ❀───╯

*🎬 Name:* ${title}
*⭐ Rating:* ${rating}
*🌍 Language:* ${lang}
*🎭 Type:* ${genres}
*📅 Premiered:* ${premiered}

*📖 Story:*
${summary}

╭───❀ 🌹 ❀───╮
   🌹 𝐏𝐎𝐖𝐄𝐑𝐄𝐃 𝐁𝐘 🌹
   💖 𝑴𝒆𝒓𝒊 𝑱𝑨𝑨𝑵 💖
╰───❀ 🌹 ❀───╯
`;

      if (image) {
        await sock.sendMessage(jid, {
          image: { url: image },
          caption: caption.trim()
        }, { quoted: m });
      } else {
        await ctx.reply(caption.trim());
      }

    } catch (e) {
      console.log('drama.js error:', e);
      await ctx.reply(`❌ Meri JAAN error aa gaya 🌹\nDobara try karo.`);
    }
  }
};