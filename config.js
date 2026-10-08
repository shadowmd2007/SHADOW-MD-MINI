import fs from "node:fs";

const env = process.env;
const onRailway = fs.existsSync("/app");

export const config = {
  botName: "SHADOW MD",
  ownerName: "RANA FURQAN",
  ownerNumber: "923003719761",
  prefix: env.PREFIX || ".",
  version: "2.0.0",
  port: Number(env.PORT) || 3000,
  // WhatsApp login is stored here. On Railway mount a Volume at /app/data.
  authDir: env.AUTH_DIR || (onRailway ? "/app/data/shadow-auth" : "./data/shadow-auth"),
  imageUrl: "https://i.ibb.co/LXZmrwt7/aac9612d34de.jpg",
  githubRepository: "https://github.com/shadowmd2007/SHADOW-MD-MINI",
  channelName: "❤️*دل  کی  دنیا*❤️",
  channelJid: "120363412495477805@newsletter",
  // Optional: set CHANNEL_LINK and GROUP_LINK in Railway Variables.
  channelLink: env.CHANNEL_LINK || "#",
  groupLink: env.GROUP_LINK || "#"
};
