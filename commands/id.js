import { reply } from "../lib/command-utils.js";
export const command = { name:"id", aliases:["jid","chatid"], category:"TOOLS", description:"Show current chat JID.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`📌 *CHAT JID:*\n${remote}`) };
