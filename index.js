import http from "http";
import makeWASocket, { useMultiFileAuthState, DisconnectReason, downloadMediaMessage, Browsers } from "@whiskeysockets/baileys";
import pino from "pino";

// Railway ke liye server zaroori hai
http.createServer((req,res)=>res.end("SHADOW-MD 37 CMDS ALIVE")).listen(process.env.PORT || 3000);

global.botSettings = { antidelete: true, antiviewonce: true, antilink: false, autoreact: false, autotyping: false, autorecording: false, antispam: false, welcome: false, goodbye: false, onlyadmin: false, antistatus: false, autoblock: false, autostatusview: false, autostatusreact: false, antigroupleft: false, pmblock: false, autostatusreply: false };

const store = new Map();
const logger = pino({ level: "silent" });

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState("./session");
  const sock = makeWASocket({ auth: state, logger, browser: Browsers.macOS("Chrome") });
  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (let m of messages) {
      if (!m.message || m.key.fromMe) continue;
      if (m.key.id) { store.set(m.key.id, {...m}); if(store.size>200) store.delete(store.keys().next().value); }
      try {
        if (global.botSettings.antiviewonce && (m.message.viewOnceMessage || m.message.viewOnceMessageV2)) {
          let inner = m.message.viewOnceMessage?.message || m.message.viewOnceMessageV2?.message;
          let type = Object.keys(inner)[0];
          let sender = m.key.participant || m.key.remoteJid;
          let buf = await downloadMediaMessage(m, "buffer", {}, { logger, reuploadRequest: sock.updateMediaMessage });
          if (type=="imageMessage") await sock.sendMessage(m.key.remoteJid, { image: buf, caption: `ViewOnce @${sender.split("@")[0]}`, mentions:[sender] });
          if (type=="videoMessage") await sock.sendMessage(m.key.remoteJid, { video: buf, caption: `ViewOnce Video @${sender.split("@")[0]}`, mentions:[sender] });
        }
      } catch(e){}
      let body = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || "";
      if (!body.startsWith(".")) continue;
      let args = body.slice(1).trim().split(/ +/);
      let cmd = args.shift().toLowerCase();
      let reply = (t) => sock.sendMessage(m.key.remoteJid, { text: t }, { quoted: m });
      if (cmd=="antidelete") { if(args[0]=="on"){global.botSettings.antidelete=true; return reply("✅ AntiDelete ON")} if(args[0]=="off"){global.botSettings.antidelete=false; return reply("❌ OFF")} return reply(global.botSettings.antidelete?"ON":"OFF") }
      if (cmd=="antiviewonce") { if(args[0]=="on"){global.botSettings.antiviewonce=true; return reply("✅ AntiViewOnce ON")} if(args[0]=="off"){global.botSettings.antiviewonce=false; return reply("❌ OFF")} return reply(global.botSettings.antiviewonce?"ON":"OFF") }
      if (cmd=="menu") return reply(`*SHADOW-MD 37 CMDS*\n\n.antidelete.antiviewonce.antilink.autoreact.autotyping.autorecording.antispam.welcome.goodbye.onlyadmin.antistatus.autoblock.autostatusview.autostatusreact.antigroupleft.pmblock.autostatusreply\n\n.ping.alive.owner.video.song.tiktok.insta.fb.apk.sticker`);
      if (cmd=="ping") return reply(`Pong! AntiDel:${global.botSettings.antidelete} View:${global.botSettings.antiviewonce}`);
      if (cmd=="alive") return reply("SHADOW-MD ALIVE ✅");
    }
  });
  sock.ev.on("connection.update", async (u) => {
    const { connection, lastDisconnect } = u;
    if (connection=="close") { let c = lastDisconnect?.error?.output?.statusCode; if(c!==DisconnectReason.loggedOut) start(); }
    else if (connection=="open") { console.log("✅ SHADOW-MD Connected!"); }
  });
}
start();