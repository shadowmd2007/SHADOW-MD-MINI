import { reply } from "../lib/command-utils.js";
export const command = { name:"power", category:"MATH", description:"Raise a number to a power.", run: async ({sock,remote,msg,args}) => { const a=Number(args[0]),b=Number(args[1]); if(!Number.isFinite(a)||!Number.isFinite(b)) return reply(sock,remote,msg,"Usage: .power 2 8"); return reply(sock,remote,msg,`🔢 ${a ** b}`); } };
