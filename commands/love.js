import { reply } from "../lib/command-utils.js";
export const command = { name:"love", category:"FUN", description:"Calculate a playful love score.", run: async ({sock,remote,msg,args}) => { const seed=args.join(" ")||"you"; let h=0; for(const c of seed) h=(h+c.charCodeAt(0))%101; return reply(sock,remote,msg,`❤️ *Love meter:* ${h}%\nFor: ${seed}`); } };
