import { reply } from "../lib/command-utils.js";
const jokes=["Why did the developer go broke? Because they used up all their cache.","I told my code I needed a break. It said: try-catch.","Why do programmers prefer dark mode? Because light attracts bugs.","My bot knows 100 jokes, but it still needs a better command parser."];
export const command = { name:"joke", category:"FUN", description:"Send a clean joke.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`😂 ${jokes[Math.floor(Math.random()*jokes.length)]}`) };
