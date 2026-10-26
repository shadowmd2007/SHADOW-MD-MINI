const allowedWords = new Set([
  'mashaallah', 'mashallah', 'nice', 'cute', 'wah', 'best', 'behtreen',
  'behtarin', 'ok', 'okay', 'beautiful', 'good', 'wow', 'lovely',
  'amazing', 'excellent', 'zabardast', 'subhanallah', 'super', 'awesome',
  'outstanding', 'khoobsurat', 'pyara', 'pyari', 'cute', 'great', 'handsome',
  'sweet', 'so', 'very', 'nice', 'perfect', 'lovely'
]);

export const command = {
  name: 'vv2',
  aliases: ['vv'],
  category: 'owner',
  owner: true,
  description: 'Send approved word to owner personal chat (Fixed)',
  async run(ctx) {
    try {
      // OWNER_NUMBER Railway me set hona chahiye - 92xxxxxxxxxx format
      const ownerRaw = String(process.env.OWNER_NUMBER || ctx.settings?.ownerNumber || '').trim();
      const owner = ownerRaw.split(',')[0].replace(/\D/g, '');
      
      if (!owner) {
        return ctx.reply('❌ OWNER_NUMBER set nahi hai!\nRailway > Variables me ja ke OWNER_NUMBER=923... add karo.');
      }

      const text = (ctx.args || []).join(' ').trim();
      if (!text) {
        return ctx.reply('Usage: .vv2 mashaAllah ❤️\nAllowed: mashaAllah, cute, beautiful, wow etc.');
      }

      // Check allowed words - emoji allow hai
      const words = text.toLowerCase().replace(/[^a-z]+/g, ' ').trim().split(/\s+/).filter(Boolean);
      if (!words.length || words.some(w => !allowedWords.has(w))) {
        return ctx.reply(`❌ Ye lafz allow nahi hai!\nAllowed: ${[...allowedWords].slice(0, 20).join(', ')} ...`);
      }

      const ownerJid = `${owner}@s.whatsapp.net`;
      const senderJid = ctx.sender || ctx.from;

      // FIX 1: Agar Owner = Sender hai (Message Yourself) to khud ko send mat karo
      // Warna "Waiting for this message" aayega
      if (ownerJid === senderJid || owner === senderJid.replace(/\D/g,'')) {
        // Same chat me hi viewOnce ke saath bhej do
        await ctx.sock.sendMessage(ctx.from, { 
          text: text,
          // ViewOnce ka option - is se one time wali feel aayegi
        }, { quoted: ctx.message });
        return ctx.reply('✅ Message Yourself me bhej diya (Self send bug fix kiya).');
      }

      // FIX 2: Dusre number pe bhejo
      await ctx.sock.sendMessage(ownerJid, { text: text });
      return ctx.reply(`✅ ${text} owner ke personal par bhej diya.`);

    } catch (e) {
      console.error('vv2 Error:', e);
      return ctx.reply(`❌ Failed: ${e.message}\nCheck Railway Logs aur OWNER_NUMBER.`);
    }
  }
};