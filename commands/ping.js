
import { config } from "../config.js";

export const command = {
  name: "ping",
  category: "MAIN",
  description: "Check bot speed",
  run: async ({ sock, remote, msg }) => {
    const start = Date.now();

    const sent = await sock.sendMessage(
      remote,
      { text: "*Pinging...* 🏓" },
      { quoted: msg }
    );

    const end = Date.now();
    const speed = end - start;

    await sock.sendMessage(remote, {
      text: `*┌───⭓ PING ⭓───*
*│* ⚡ *Speed:* ${speed} ms
*│* 🚀 *Bot:* ${config.botName}
*│* 👑 *Owner:* ${config.ownerName}
*└───────────⭓*

> *SHADOW MD - Super Fast!*`,
      edit: sent.key
    });
  }
};
