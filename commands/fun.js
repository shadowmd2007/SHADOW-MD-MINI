const jokes = [
  'استاد: ہوم ورک کہاں ہے؟ شاگرد: سر گھر پر ہے، اسی لیے تو ہوم ورک ہے! 😂',
  'امی: پڑھائی کیسی چل رہی ہے؟ بیٹا: موبائل کی بیٹری جیسی، ہر وقت کم! 🤣',
  'دوست: تم جم کیوں نہیں جاتے؟ دوسرا: زندگی کا وزن ہی بہت ہے! 😂',
  'استاد: دیر سے کیوں آئے؟ شاگرد: سر خواب میں اسکول آیا تھا، واپسی میں دیر ہوگئی! 🤣',
  'ابو: امتحان میں کتنے نمبر آئے؟ بیٹا: سوال مشکل تھے، نمبر شرما کر نہیں آئے! 😂',
  'دوست: تم خاموش کیوں ہو؟ دوسرا: بیلنس ختم ہے، باتیں بعد میں! 🤣',
  'امی: موبائل رکھ دو! بیٹا: امی بس آخری میسج۔ امی: یہ آخری میسج کل بھی تھا! 😂',
  'استاد: سب سے تیز کیا ہے؟ شاگرد: چھٹی کی گھنٹی، سنتے ہی سب بھاگتے ہیں! 🤣',
  'زندگی کا سب سے بڑا دکھ: موبائل ہاتھ میں ہو اور چارجر دوسرے کمرے میں! 😂',
  'دوست: تم بہت بدل گئے ہو۔ دوسرا: بھائی، سافٹ ویئر اپڈیٹ ہوا ہے! 🤣'
];

function hashName(s) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h);
}

export const commands = [
  {
    name: 'joke',
    aliases: ['jokes', 'urdujoke'],
    category: 'FUN',
    description: 'Urdu joke',
    run: async (ctx) => {
      const joke = jokes[Math.floor(Math.random() * jokes.length)];
      return ctx.reply(`😂 *SHADOW MD JOKE*\n\n${joke}`);
    }
  },
  {
    name: 'love',
    aliases: ['lovecalc', 'lovemeter'],
    category: 'FUN',
    description: 'Fun love percentage',
    run: async (ctx) => {
      const names = ctx.args.join(' ')
        .split(/\s*(?:\+|,|&| and )\s*/i)
        .map(s => s.trim())
        .filter(Boolean);

      if (names.length < 2) {
        return ctx.reply(`💖 Example:\n${ctx.prefix}love Ali Sara\n${ctx.prefix}love Ali, Sara`);
      }

      const pair = names.slice(0, 2).map(s => s.toLowerCase()).sort().join('|');
      const percent = hashName(pair) % 101;

      return ctx.reply(
        `💘 *LOVE CALCULATOR*\n\n❤️ ${names[0]} + ${names[1]}\n💞 Fun score: *${percent}%*\n\n_Just for fun — real feelings measure nahi hoti._`
      );
    }
  },
  {
    name: 'kiss',
    aliases: ['kissimage'],
    category: 'FUN',
    description: 'Send a kiss anime image',
    run: async (ctx) => {
      try {
        const r = await fetch('https://api.waifu.pics/sfw/kiss', {
          signal: AbortSignal.timeout(8000)
        });
        if (!r.ok) throw new Error('Image API unavailable');

        const data = await r.json();
        if (!data.url || !data.url.startsWith('https://')) {
          throw new Error('No image URL');
        }

        await ctx.sock.sendMessage(ctx.jid, {
          image: { url: data.url },
          caption: '💋 *SHADOW MD*'
        }, { quoted: ctx.m });
      } catch {
        return ctx.reply('❌ Kiss image service abhi available nahi. Baad mein try karo.');
      }
    }
  }
];

export default { commands };