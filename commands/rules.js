import { reply } from "../lib/command-utils.js";
export const command = { name:"rules", category:"GROUP", description:"Show basic group rules.", group:true, run: async ({sock,remote,msg}) => reply(sock,remote,msg,"📜 *GROUP RULES*\n• Respect members\n• No spam\n• Follow admin instructions\n• Keep content appropriate") };
