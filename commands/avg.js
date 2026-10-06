import { reply } from "../lib/command-utils.js";
export const command = { name:"avg", category:"MATH", description:"Average numbers.", run: async ({sock,remote,msg,args}) => { const n=args.map(Number); if(!n.length||n.some(x=>!Number.isFinite(x))) return reply(sock,remote,msg,"Usage: .avg 10 20 30"); return reply(sock,remote,msg,`📊 ${n.reduce((a,b)=>a+b,0)/n.length}`); } };
