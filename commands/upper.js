import { reply } from "../lib/command-utils.js";
export const command = { name:"upper", category:"TOOLS", description:"Convert text to uppercase.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,args.length?args.join(" ").toUpperCase():"Usage: .upper hello") };
