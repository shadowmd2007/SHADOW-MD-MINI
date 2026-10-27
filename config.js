
try {
  const d = await import('dotenv');
  (d.default ?? d).config();
} catch {}

const owner = (process.env.OWNER_NUMBER || '923003719761').split(',')[0].trim();

export const config = {
  botName: "RANA FURQAN MD",
  ownerName: "Rana Furqan Rajput",
  ownerNumber: owner,
  botNumber: owner,
  presName: "RANA FURQAN",
  channelName: "RANA FURQAN MD Channel",
  channelLink: "https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J",
  channelJid: "0029VbCiT0g8vd1P3dJZqm2J@newsletter",
  groupName: "RANA FURQAN MD Group",
  groupLink: "https://chat.whatsapp.com/FGW9EITclIg2obBhZkkVTn",
  githubRepository: "https://whatsapp.com/channel/0029VbCiT0g8vd1P3dJZqm2J",
  // 🌹 FIXED DP - Ab yahi ayegi Menu pe + Pair Site pe
  menuImage: "https://i.ibb.co/BHfCmfbw/jawadmd.jpg",
  botImage: "https://i.ibb.co/BHfCmfbw/jawadmd.jpg",
  prefix: ".",
  mode: "public",
  version: "5.0.0",
  authDir: "./auth",
  port: process.env.PORT || 3000,
  keywords: [
    "mashaallah", "mashallah", "nice", "cute", "wah", "best",
    "behtreen", "behtarin", "ok", "okay", "beautiful", "good",
    "wow", "lovely", "amazing", "excellent", "zabardast",
    "subhanallah", "super", "awesome"
  ]
};

export default config;
