import { reply } from "../lib/command-utils.js";
export const command = { name:"kiss", category:"FUN", description:"Send a playful kiss.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,`😘 ${args.join(" ")||"you"} mwah!`) };
