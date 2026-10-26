
const settings = {
  enabled: true
};

export default {
  command: {
    name: 'antidelete',
    aliases: ['ad'],
    category: 'owner',
    description: 'Enable or disable antidelete'
  },

  async run(m, args) {
    const action = (args?.[0] || 'status').toLowerCase();

    if (action === 'on') {
      settings.enabled = true;
      return m.reply('✅ Antidelete enabled.');
    }

    if (action === 'off') {
      settings.enabled = false;
      return m.reply('❌ Antidelete disabled.');
    }

    return m.reply(
      `Antidelete: ${settings.enabled ? 'ON' : 'OFF'}\n\n` +
      '.antidelete on - Enable\n' +
      '.antidelete off - Disable'
    );
  }
};
