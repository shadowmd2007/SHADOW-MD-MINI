import { requireGroupAdmin, reply } from "../lib/command-utils.js";
export const command = { name:"announce", category:"GROUP", description:"Send an admin announcement.", group:true, run: async (ctx) => { await requireGroupAdmin(ctx); const t=ctx.args.join(" "); return reply(ctx.sock,ctx.remote,ctx.msg,t?`📢 *ANNOUNCEMENT*\n\n${t}`:"Usage: .announce your message"); } };
