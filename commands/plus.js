import { reply, parseSimpleMath } from "../lib/command-utils.js";
export const command = { name:"plus", category:"MATH", description:"Add numbers.", run: async ({sock,remote,msg,args}) => { const n=args.map(Number); if(!n.length||n.some(x=>!Number.isFinite(x))) return reply(sock,remote,msg,"Usage: .plus 10 20 30"); return reply(sock,remote,msg,`➕ ${n.reduce((a,b)=>a+b,0)}`); } };
