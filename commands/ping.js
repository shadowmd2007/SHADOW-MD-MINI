import { reply } from "../lib/command-utils.js";
export const command = { name:"ping", aliases:["p"], category:"MAIN", description:"Check bot response.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,"🏓 *PONG!*\n🟢 SHADOW MD is responding.") };
