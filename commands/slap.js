import { reply } from "../lib/command-utils.js";
export const command = { name:"slap", category:"FUN", description:"Playful slap command.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,`👋 ${args.join(" ")||"someone"} got a playful slap!`) };
