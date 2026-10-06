import { reply } from "../lib/command-utils.js";
export const command = { name:"date", category:"UTILITY", description:"Show current date.", run: async ({sock,remote,msg}) => reply(sock,remote,msg,`📅 ${new Intl.DateTimeFormat("en-PK",{dateStyle:"full",timeZone:"Asia/Karachi"}).format()}`) };
