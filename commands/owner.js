import { config } from "../config.js"; import { reply } from "../lib/command-utils.js";
export const command = { name:"owner", category:"MAIN", description:"Show owner contact.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`👑 *OWNER*\n${config.ownerName}\n📱 https://wa.me/${config.ownerNumber}`) };
