import { reply } from "../lib/command-utils.js";
const roasts=["You're not slow; you're running in power-saving mode.","Your Wi‑Fi has more confidence than your decisions.","Even my error logs have fewer issues.","I would roast you harder, but the bot has rate limits."];
export const command = { name:"roast", category:"FUN", description:"Send a light roast.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,`🔥 ${args.join(" ")||"You"}: ${roasts[Math.floor(Math.random()*roasts.length)]}`) };
