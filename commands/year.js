import { reply } from "../lib/command-utils.js";
export const command = { name:"year", category:"UTILITY", description:"Show current year.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`📆 Current year: ${new Date().getFullYear()}`) };
