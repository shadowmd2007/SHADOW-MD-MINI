import { reply } from "../lib/command-utils.js";
const quotes=["Discipline beats motivation when motivation fades.","Small progress is still progress.","Build quietly. Let results make the noise.","Consistency turns plans into results.","Your future self is built by today's actions."];
export const command = { name:"quote", category:"FUN", description:"Get a motivational quote.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`💬 ${quotes[Math.floor(Math.random()*quotes.length)]}`) };
