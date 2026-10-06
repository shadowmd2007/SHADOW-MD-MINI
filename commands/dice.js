import { reply } from "../lib/command-utils.js";
export const command = { name:"dice", category:"FUN", description:"Roll a six-sided die.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🎲 You rolled *${1+Math.floor(Math.random()*6)}*`) };
