import { reply, formatDuration } from "../lib/command-utils.js";
export const command = { name:"runtime", category:"MAIN", description:"Show process uptime.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`⏱️ *RUNTIME:* ${formatDuration(process.uptime())}`) };
