import { reply } from "../lib/command-utils.js";
export const command = { name:"speed", category:"MAIN", description:"Measure command response latency.", run: async ({sock,remote,msg}) => { const start=Date.now(); await reply(sock,remote,msg,"⚡ Measuring..."); const ms=Date.now()-start; return reply(sock,remote,msg,`⚡ *Response:* ${ms} ms`); } };
