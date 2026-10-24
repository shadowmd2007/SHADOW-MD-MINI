import { reply } from "../lib/command-utils.js";
const lines=["You have excellent energy.","You keep moving forward, and that matters.","Your consistency is your superpower.","You bring good vibes to the chat."];
export const command = { name:"compliment", category:"FUN", description:"Send a positive compliment.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,`✨ ${args.join(" ")||"You"}: ${lines[Math.floor(Math.random()*lines.length)]}`) };
