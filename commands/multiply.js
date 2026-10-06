import { reply } from "../lib/command-utils.js";
export const command = { name:"multiply", category:"MATH", description:"Multiply numbers.", run: async ({sock,remote,msg,args}) => { const n=args.map(Number); if(!n.length||n.some(x=>!Number.isFinite(x))) return reply(sock,remote,msg,"Usage: .multiply 2 3 4"); return reply(sock,remote,msg,`✖️ ${n.reduce((a,b)=>a*b,1)}`); } };
