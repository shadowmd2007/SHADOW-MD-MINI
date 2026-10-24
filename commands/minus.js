import { reply } from "../lib/command-utils.js";
export const command = { name:"minus", category:"MATH", description:"Subtract numbers.", run: async ({sock,remote,msg,args}) => { const n=args.map(Number); if(n.length<2||n.some(x=>!Number.isFinite(x))) return reply(sock,remote,msg,"Usage: .minus 20 5"); return reply(sock,remote,msg,`➖ ${n.slice(1).reduce((a,b)=>a-b,n[0])}`); } };
