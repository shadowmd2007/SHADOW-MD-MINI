import { reply } from "../lib/command-utils.js";
export const command = { name:"reverse", category:"TOOLS", description:"Reverse text.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,args.length?Array.from(args.join(" ")).reverse().join(""):"Usage: .reverse hello") };
