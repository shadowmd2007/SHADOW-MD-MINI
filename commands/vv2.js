const triggers = [
'mashaallah',
'mashallah',
'nice',
'cute',
'wah',
'best',
'behtreen',
'behtarin',
'ok',
'okay',
'beautiful',
'good',
'wow',
'lovely',
'amazing',
'excellent',
'zabardast',
'subhanallah',
'super',
'awesome',
'handsome',
'sweet',
'so cute',
'very nice',
'great',
'perfect',
'outstanding',
'khoobsurat',
'pyara',
'pyari',
'wah wah',
'💗',
'💔',
'🌹',
'😘',
'❣️',
'💘',
'🙂',
'❤️',
'😍',
'🥰',
'💕',
'💖',
'✨',
'🔥',
'👍',
'❤️‍🔥',
'💞',
'💓',
'🌸',
'🫶'
];

export default {
command: {
name: 'vv2',
aliases: ['vv'],
category: 'owner',
description: 'Send a text to personal WhatsApp'
},

async run(m, args, sock) {
const owner = process.env.OWNER_NUMBER;

if (!owner) {
  return m.reply('❌ Railway Variables mein OWNER_NUMBER set karo.');
}

const text = args?.join(' ').trim();

if (!text) {
  return m.reply(
    'Example: .vv2 MashaAllah ❤️\n' +
    'Available words: ' + triggers.slice(0, 20).join(', ')
  );
}

const number = owner.replace(/\D/g, '');
const jid = `${number}@s.whatsapp.net`;

try {
  await sock.sendMessage(jid, {
    text: `📩 *Shadow MD Mini*\n\n${text}`
  });

  return m.reply('✅ Personal WhatsApp par bhej diya.');
} catch (error) {
  console.error('VV2 Error:', error.message);
  return m.reply('❌ Message send nahi hua.');
}

}
};