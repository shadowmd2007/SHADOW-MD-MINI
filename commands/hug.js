import { reply } from "../lib/command-utils.js";
export const command = { name:"hug", category:"FUN", description:"Send a virtual hug.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,`🤗 ${args.join(" ")||"Everyone"} gets a big hug!`) };
