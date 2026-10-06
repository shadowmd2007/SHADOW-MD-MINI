import { config } from "../config.js"; import { reply } from "../lib/command-utils.js";
export const command = { name:"url", category:"TOOLS", description:"Show official links.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🔗 *OFFICIAL LINKS*\nGitHub: ${config.githubRepository}\nChannel: ${config.channelLink}\nGroup: ${config.groupLink}`) };
