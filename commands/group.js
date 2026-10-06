import { config } from "../config.js"; import { reply } from "../lib/command-utils.js";
export const command = { name:"group", category:"MAIN", description:"Show official group link.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`👥 *GROUP*\n${config.groupName}\n${config.groupLink}`) };
