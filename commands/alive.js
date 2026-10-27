import config from '../config.js';
const alive = async (sock, m) => {
  await sock.sendMessage(m.key.remoteJid, {
    image: { url: config.botImage },
    caption: `🌹 *RANA FURQAN MD IS ALIVE!* 🌹\n\n✅ Bot: ${config.botName}\n👑 Owner: RANA FURQAN\n💖 Meri Jaan\n⚡ Prefix: ${config.prefix}\n\nType ${config.prefix}menu for commands`
  }, { quoted: m });
};
export default alive;
alive.command = ['alive','bot','online'];