import { config } from "../config.js"; import { reply } from "../lib/command-utils.js";
export const command = { name:"repo", category:"MAIN", description:"Show repository link.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`💻 *GITHUB*\n${config.githubRepository}`) };
