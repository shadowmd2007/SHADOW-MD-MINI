import { reply } from "../lib/command-utils.js";
export const command = { name:"restart", category:"OWNER", description:"Restart the Node process.", owner:true, run: async ({sock,remote,msg}) => { await reply(sock,remote,msg,"♻️ Restarting bot..."); setTimeout(()=>process.exit(0),500); } };
