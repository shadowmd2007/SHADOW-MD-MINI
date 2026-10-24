import dotenv from 'dotenv';
dotenv.config();

const config = {
  botName: "SHADOW MD",
  ownerName: "RANA FURQAN",
  ownerNumber: "923003719761",
  botNumber: "923003719761",
  presName: "RANA FURQAN",

  channelLink: "https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J",
  groupLink: "https://chat.whatsapp.com/FGW9EITclIg2obBhZkkVTn",

  menuImage: "https://files.catbox.moe/y04tbj.jpg",
  botImage: "https://files.catbox.moe/y04tbj.jpg",

  prefix: ".",
  mode: "public",
  version: "2.0.0",
  authDir: process.env.AUTH_DIR || "./auth",
  port: process.env.PORT || 3000,

  // GitHub repo (for .repo / .update)
  repo: process.env.REPO_URL || "",

  // Ye words owner kisi view-once / status par reply kare to media owner ke personal chat mein save hota hai
  keywords: ["cute", "beautiful", "ok", "😊", "❤️", "rana", "💋", "🌹", "wah", "mashaallah", "lajawab"],
};

export default config;
