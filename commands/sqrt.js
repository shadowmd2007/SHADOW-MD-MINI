import { reply } from "../lib/command-utils.js";
export const command = { name:"sqrt", category:"MATH", description:"Square root.", run: async ({sock,remote,msg,args}) => { const n=Number(args[0]); if(!Number.isFinite(n)||n<0) return reply(sock,remote,msg,"Usage: .sqrt 144"); return reply(sock,remote,msg,`√ ${Math.sqrt(n)}`); } };
