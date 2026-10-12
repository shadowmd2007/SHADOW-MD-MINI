import { config } from "../config.js"; import { reply } from "../lib/command-utils.js";
export const command = { name:"channel", category:"MAIN", description:"Show WhatsApp channel.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`📢 *CHANNEL*\n${config.channelName}\n${config.channelLink}`) };
