import { config } from "../config.js";

export const command = {
  name: "ping",
  category: "MAIN",
  description: "Check bot speed",
  run: async ({ sock, remote, msg }) => {
    const start = Date.now();
    const sent = await sock.sendMessage(remote, { text: "*Pinging...* 🏓" }, { quoted: msg });
    const end = Date.now();
    const speed = end - start;
    
    await sock.sendMessage(remote, { 
      text: `*┌───⭓ PING ⭓───*\n*│* ⚡ *Speed:* ${speed} ms\n*│* 🚀 *Bot:* ${config.botName}\n*│* 👑 *Owner:* ${config.ownerName}\n*└───────────⭓*\n\n> *SHADOW MD - Super Fast!*`,
      edit: sent.key 
    });
  }
}; 