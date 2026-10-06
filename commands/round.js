import { reply } from "../lib/command-utils.js";
export const command = { name:"round", category:"MATH", description:"Round a number.", run: async ({sock,remote,msg,args}) => { const n=Number(args[0]); if(!Number.isFinite(n)) return reply(sock,remote,msg,"Usage: .round 12.6"); return reply(sock,remote,msg,`🔘 ${Math.round(n)}`); } };
