import { reply } from "../lib/command-utils.js";
export const command = { name:"base64", category:"TOOLS", description:"Encode text as Base64.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,args.length?Buffer.from(args.join(" "),"utf8").toString("base64"):"Usage: .base64 hello") };
