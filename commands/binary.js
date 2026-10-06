import { reply } from "../lib/command-utils.js";
export const command = { name:"binary", category:"TOOLS", description:"Convert text to binary.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,args.length?args.join(" ").split("").map(c=>c.charCodeAt(0).toString(2).padStart(8,"0")).join(" "):"Usage: .binary hello") };
