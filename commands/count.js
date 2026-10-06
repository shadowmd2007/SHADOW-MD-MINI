import { reply } from "../lib/command-utils.js";
export const command = { name:"count", category:"TOOLS", description:"Count characters and words.", run: async ({sock,remote,msg,args}) => { const t=args.join(" "); return reply(sock,remote,msg,t?`🔢 Words: ${t.trim().split(/\s+/).length}\nCharacters: ${t.length}`:"Usage: .count some text"); } };
