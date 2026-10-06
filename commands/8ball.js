import { reply } from "../lib/command-utils.js";
const answers=["Yes.","No.","Definitely.","Probably.","Ask again later.","Looks good.","Not today."];
export const command = { name:"8ball", category:"FUN", description:"Answer a yes/no question.", run: async ({sock,remote,msg,args}) => reply(sock,remote,msg,args.length?`🎱 ${answers[Math.floor(Math.random()*answers.length)]}`:"Usage: .8ball Will I succeed?") };
