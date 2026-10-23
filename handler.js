import fs from 'fs';
import path from 'path';
import config from './config.js';

export default async function handleMessage(sock, m) {
  try {
    if (!m.message) return;
    const msgType = Object.keys(m.message)[0];
    const body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || m.message.videoMessage?.caption || "";
    if (!body.startsWith(config.prefix)) return;

    const args = body.slice(config.prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const text = args.join(" ");

    // Load all plugins
    const pluginDir = path.join(process.cwd(), 'plugins');
    const files = fs.readdirSync(pluginDir).filter(f => f.endsWith('.js'));
    
    for (const file of files) {
      const plugin = await import(`./plugins/${file}?update=${Date.now()}`);
      if (plugin.default && plugin.default.command) {
        const cmds = Array.isArray(plugin.default.command) ? plugin.default.command : [plugin.default.command];
        if (cmds.includes(command)) {
          await plugin.default.run(sock, m, { args, text, command, config });
          break;
        }
      }
    }
  } catch (e) {
    console.log("Handler Error:", e);
  }
}