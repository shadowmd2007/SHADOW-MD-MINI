import { reply } from "../lib/command-utils.js";
export const command = { name:"coinflip", category:"FUN", description:"Flip a virtual coin.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🪙 *${Math.random()<0.5?"HEADS":"TAILS"}*`) };
