
export const command = {
  name: 'gpt',
  aliases: ['ai', 'chatgpt'],
  category: 'AI',
  description: 'ChatGPT AI assistant',

  run: async (ctx) => {
    const prompt = ctx.args.join(' ').trim();

    if (!prompt) {
      return ctx.reply(
        `🤖 *SHADOW MD — CHATGPT*\n\n` +
        `Example: ${ctx.prefix}gpt Pakistan ki history batao\n` +
        `Example: ${ctx.prefix}ai Salam, kaise ho?\n` +
        `Example: ${ctx.prefix}chatgpt Explain AI\n\n` +
        `🌹 Powered by Meri JAAN`
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return ctx.reply(
        '❌ OPENAI_API_KEY Railway Variables mein set nahi hai.\n\n🌹 Powered by Meri JAAN'
      );
    }

    try {
      await ctx.sock.sendPresenceUpdate('composing', ctx.jid);

      const response = await fetch(
        'https://api.openai.com/v1/responses',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4.1-mini',
            input: [
              {
                role: 'system',
                content: 'You are Shadow MD WhatsApp chatbot. Answer helpfully and clearly in the same language as the user. Keep WhatsApp replies concise.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            max_output_tokens: 700
          }),
          signal: AbortSignal.timeout(45000)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.error('[GPT API]', response.status, data);
        return ctx.reply(
          '❌ ChatGPT API error. API key, billing aur model access check karein.\n\n🌹 Powered by Meri JAAN'
        );
      }

      const answer = (data.output || [])
        .flatMap(item => item.content || [])
        .filter(item => item.type === 'output_text')
        .map(item => item.text)
        .join('\n')
        .trim();

      if (!answer) {
        return ctx.reply(
          '❌ ChatGPT se jawab nahi mila. Dobara try karein.\n\n🌹 Powered by Meri JAAN'
        );
      }

      return ctx.reply(
        `🤖 *CHATGPT — SHADOW MD*\n\n${answer.slice(0, 3500)}\n\n🌹 Powered by Meri JAAN`
      );
    } catch (error) {
      console.error('[GPT ERROR]', error.message);

      return ctx.reply(
        '❌ Connection error. Thori der baad dobara try karein.\n\n🌹 Powered by Meri JAAN'
      );
    } finally {
      try {
        await ctx.sock.sendPresenceUpdate('paused', ctx.jid);
      } catch {}
    }
  }
};

export default { command };
