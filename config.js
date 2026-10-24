import dotenv from 'dotenv';
dotenv.config();

const config = {
  // --- BOT INFO ---
  botName: "SHADOW MD",
  ownerName: "RANA FURQAN",
  ownerNumber: "923803719761",
  botNumber: "923803719761",
  presName: "RANA FURQAN",

  // --- CHANNEL - AAPKA DIYA HUA LINK ---
  channelName: "SHADOW MD OFFICIAL",
  channelLink: "https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J",
  newsletterJid: "120363318357580980@newsletter",
  newsletterName: "SHADOW MD",

  // --- GROUP - AAPKA DIYA HUA LINK ---
  groupName: "SHADOW MD GROUP",
  groupLink: "https://chat.whatsapp.com/FGW9EITclIg2obBhZkkVTn",
  groupJid: "1203630xxxxx@g.us",

  // --- MENU DP - AAPKI NEW DP ---
  menuImage: "https://files.catbox.moe/y04tbj.jpg",
  menuImage2: "https://files.catbox.moe/y04tbj.jpg",
  thumbnail: "https://files.catbox.moe/y04tbj.jpg",
  botImage: "https://files.catbox.moe/y04tbj.jpg",
  aliveImage: "https://files.catbox.moe/y04tbj.jpg",

  // --- SETTINGS ---
  prefix: ".",
  mode: "public",
  version: "2.0.0",
  authDir: process.env.AUTH_DIR || "./auth",
  port: process.env.PORT || 3000,
  
  // --- LINKS ---
  github: "https://github.com/Furqan-MD/SHADOW-MD-MINI",
};

export default config;