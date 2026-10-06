import { reply } from "../lib/command-utils.js";
const q=["Send a harmless funny sticker.","Change your status for 10 minutes.","Compliment the next person who messages you.","Tell the group your funniest clean joke."];
export const command = { name:"dare", category:"FUN", description:"Get a harmless dare.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🎯 *DARE:* ${q[Math.floor(Math.random()*q.length)]}`) };
