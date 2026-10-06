import { reply } from "../lib/command-utils.js";
export const command = { name:"unbase64", category:"TOOLS", description:"Decode Base64.", run: async ({sock,remote,msg,args}) => { try{return reply(sock,remote,msg,args.length?Buffer.from(args.join(" "),"base64").toString("utf8"):"Usage: .unbase64 SGVsbG8=")}catch{return reply(sock,remote,msg,"❌ Invalid Base64.")} } };
