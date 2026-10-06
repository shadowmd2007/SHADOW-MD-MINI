import { reply } from "../lib/command-utils.js";
export const command = { name:"groupid", category:"GROUP", description:"Show group JID.", group:true, run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🆔 ${remote}`) };
