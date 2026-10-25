export default {
command: {
name: 'vv3',
aliases: [],
category: 'owner',
description: 'Reply to the original sender'
},

async run(m, args, sock) {
const text = args?.join(' ').trim();

if (!text) {
  return m.reply(
    '❌ Message likho.\nExample: .vv3 Hello ❤️'
  );
}

const sender = m.key?.participant || m.key?.remoteJid;

if (
  !sender ||
  sender === 'status@broadcast' ||
  sender.endsWith('@g.us')
) {
  return m.reply(
    '❌ Personal chat mein sender ko reply karo.'
  );
}

try {
  await sock.sendMessage(sender, {
    text: `💌 *Shadow MD Mini*\n\n${text}`
  });

  return m.reply('✅ Sender ko message bhej diya.');
} catch (error) {
  console.error('VV3 Error:', error.message);
  return m.reply('❌ Message send nahi hua.');
}

}
};