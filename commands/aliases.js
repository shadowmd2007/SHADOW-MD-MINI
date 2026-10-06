import { reply } from "../lib/command-utils.js";
const map={gp:"group",ass:"alive",test:"ping",tools:"help",mainmenu:"menu",allmenu:"menu",gdesc:"ginfo",listadmins:"admins",tagadmins:"tagall",tag:"tagall",totag:"tagall",kickme:"kick",block:"kick"};
export const command={name:"_aliases",hidden:true,run:async()=>{}};
export const aliases=map;
