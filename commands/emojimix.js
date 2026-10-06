import { reply } from "../lib/command-utils.js";
export const command = { name:"emojimix", category:"FUN", description:"Combine two emojis as text.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,args.length>=2?`${args[0]} + ${args[1]} = ${args[0]}${args[1]}`:"Usage: .emojimix ❤️ 🔥") };
