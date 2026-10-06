import { reply } from "../lib/command-utils.js";
export const command = { name:"whoami", category:"TOOLS", description:"Show your WhatsApp JID.", run: async ({sock,remote,msg,sender}) => reply(sock,remote,msg,`👤 Your number: ${sender}\nJID: ${msg.key.participant||remote}`) };
