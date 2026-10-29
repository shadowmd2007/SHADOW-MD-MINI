
export const command = {
  name: 'ai',
  aliases: ['chatbot', 'askai'],
  category: 'AI',
  description: 'AI chatbot',

  run: async (ctx) => {
    const prompt = ctx.args.join(' ').trim();

    if (!prompt) {
      return ctx.reply(
        `🤖 *SHADOW AI CHATBOT*\n\n` +
        `Example: ${ctx.prefix}ai Pakistan ki history batao\n` +
        `Example: ${ctx.prefix}chatbot Salam, kaise ho?\n\n` +
        `🌹 Powered by Meri JAAN`
      );
    }

    try {
      await ctx.reply('🤖 AI jawab tayar kar raha hai...');

      const url =
        'https://text.pollinations.ai/' +
        encodeURIComponent(prompt);

      const response = await fetch(url, {
        headers: { Accept: 'text/plain' },
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`AI API error: ${response.status}`);
      }

      const answer = (await response.text()).trim();

      if (!answer) {
        throw new Error('Empty AI response');
      }

      return ctx.reply(
        `🤖 *SHADOW AI*\n\n${answer.slice(0, 3500)}\n\n🌹 Powered by Meri JAAN`
      );
    } catch (error) {
      console.log('[AI ERROR]', error.message);

      return ctx.reply(
        '❌ AI abhi response nahi de raha. Thori der baad try karein.\n\n🌹 Powered by Meri JAAN'
      );
    }
  }
};

export default { command };
