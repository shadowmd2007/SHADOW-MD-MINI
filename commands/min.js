import { reply } from "../lib/command-utils.js";
export const command = { name:"min", category:"MATH", description:"Find minimum.", run: async ({sock,remote,msg,args}) => { const n=args.map(Number); if(!n.length||n.some(x=>!Number.isFinite(x))) return reply(sock,remote,msg,"Usage: .min 10 20 5"); return reply(sock,remote,msg,`⬇️ ${Math.min(...n)}`); } };
