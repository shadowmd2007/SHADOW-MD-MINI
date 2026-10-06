import { reply, formatDate } from "../lib/command-utils.js";
export const command = { name:"time", category:"UTILITY", description:"Show Pakistan time.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🕒 *PAKISTAN TIME*\n${formatDate()}`) };
