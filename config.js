// config.js (FIXED) - ab named export `config` bhi hai aur default export bhi.
// dotenv optional hai: install na ho to bhi crash nahi hoga.
try {
  const d = await import('dotenv');
  (d.default ?? d).config();
} catch {}

const owner = (process.env.OWNER_NUMBER || '923003719761').split(',')[0].trim();

export const config = {
  botName: "SHADOW MD MINI",
  ownerName: "RANA FURQAN",
  ownerNumber: owner,
  botNumber: owner,
  presName: "RANA FURQAN",
  channelName: "SHADOW MD Channel",
  channelLink: "https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J",
  groupName: "SHADOW MD Group",
  groupLink: "https://chat.whatsapp.com/FGW9EITclIg2obBhZkkVTn",
  githubRepository: process.env.GITHUB_REPO || "https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J",
  menuImage: "https://files.catbox.moe/y04tbj.jpg",
  botImage: "https://files.catbox.moe/y04tbj.jpg",
  prefix: ".",
  mode: "public",
  version: "2.0.0",
  authDir: process.env.AUTH_DIR || "./auth",
  port: process.env.PORT || 3000,
  keywords: ["cute", "beautiful", "ok", "mashaAllah", "lajawab"]
};

export default config;