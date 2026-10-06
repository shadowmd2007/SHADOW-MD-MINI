import { reply } from "../lib/command-utils.js";
const q=["What goal are you avoiding right now?","What is one thing you want to improve this month?","Who inspires you the most?","What is a habit you want to build?"];
export const command = { name:"truth", category:"FUN", description:"Get a truth question.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🎤 *TRUTH:* ${q[Math.floor(Math.random()*q.length)]}`) };
