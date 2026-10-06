import { reply } from "../lib/command-utils.js";
export const command = { name:"lower", category:"TOOLS", description:"Convert text to lowercase.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,args.length?args.join(" ").toLowerCase():"Usage: .lower HELLO") };
