import { reply } from "../lib/command-utils.js";
export const command = { name:"max", category:"MATH", description:"Find maximum.", run: async ({sock,remote,msg,args}) => { const n=args.map(Number); if(!n.length||n.some(x=>!Number.isFinite(x))) return reply(sock,remote,msg,"Usage: .max 10 20 5"); return reply(sock,remote,msg,`⬆️ ${Math.max(...n)}`); } };
