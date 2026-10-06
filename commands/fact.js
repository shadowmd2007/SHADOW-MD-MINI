import { reply } from "../lib/command-utils.js";
const facts=["Octopuses have three hearts.","A day on Venus is longer than its year.","Bananas are botanically berries.","Honey can remain edible for a very long time when properly stored.","The Eiffel Tower can grow slightly in hot weather."];
export const command = { name:"fact", category:"FUN", description:"Send a random fact.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`🧠 *FACT*\n${facts[Math.floor(Math.random()*facts.length)]}`) };
