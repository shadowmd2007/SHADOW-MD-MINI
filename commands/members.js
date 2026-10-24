import { reply } from "../lib/command-utils.js";
export const command = { name:"members", category:"GROUP", description:"Show member count.", group:true, run: async ({sock,remote,msg}) => { const m=await sock.groupMetadata(remote); return reply(sock,remote,msg,`👥 Members: *${m.participants.length}*`); } };
