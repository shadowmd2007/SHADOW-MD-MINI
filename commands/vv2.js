export const command = {
  name: 'vv2',
  aliases: ['vv','viewonce'],
  category: 'SECURITY',
  description: 'Open ViewOnce - Private me ayega',
  run: async (ctx) => {
    const { sock, m, jid } = ctx;
    const words = ["MashaAllah 🌹","SubhanAllah ✨","Cute 🥰","Nice 😍","Beautiful 💖","Mashallah 🌹","Zabardast 🔥","Lovely 💕","Amazing 😍","Awesome 🤩","Behtreen 🌹","Wah 😍","Super 👌","Excellent 💫","Good 😊","Wow 🤩","Meri JAAN 🌹"];
    const random = words[Math.floor(Math.random()*words.length)];
    const ctxInfo = m.message?.extendedTextMessage?.contextInfo;
    if (!ctxInfo?.quotedMessage) return await ctx.reply(`❌ ViewOnce ko Reply karke .vv2 likho\nPhoto > Reply > .vv2`);
    try{
      let qMsg = ctxInfo.quotedMessage;
      if(qMsg.viewOnceMessageV2) qMsg = qMsg.viewOnceMessageV2.message;
      if(qMsg.viewOnceMessage) qMsg = qMsg.viewOnceMessage.message;
      if(qMsg.ephemeralMessage) qMsg = qMsg.ephemeralMessage.message;
      const { downloadMediaMessage } = await import('@whiskeysockets/baileys');
      const pino = (await import('pino')).default; const logger = pino({ level: 'silent' });
      const target = { key: { id: ctxInfo.stanzaId }, message: qMsg };
      const buf = await downloadMediaMessage(target, 'buffer', {}, { logger, reuploadRequest: sock.updateMediaMessage });
      // PRIVATE ME BHEJO - SOCK.USER.ID (BOT NUMBER)
      const privateJid = sock.user.id;
      if(qMsg.imageMessage){
        await sock.sendMessage(privateJid, { image: buf, caption: `🔓 *ViewOnce Opened Private*\n\n${random}\nFrom: ${jid}\n🌹 Meri JAAN` });
        await ctx.reply(`✅ *Opened!* Check your private (bot number) me bhej diya hai\n${random}`);
      }else{
        await sock.sendMessage(privateJid, { video: buf, caption: `🔓 *ViewOnce Video Private*\n${random}\nFrom: ${jid}` });
        await ctx.reply(`✅ Video private me bhej diya\n${random}`);
      }
    }catch(e){ await ctx.reply(`❌ Fail: ${e.message}`); }
  }
};