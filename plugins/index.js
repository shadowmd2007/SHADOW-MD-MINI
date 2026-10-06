import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const commands = new Map();
export const categories = new Map();
let loaded = false;

export async function loadCommands() {
  if (loaded) return { loaded: commands.size, failed: 0 };
  const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../commands");
  const files = (await fs.readdir(dir)).filter(f => f.endsWith(".js") && f !== "aliases.js").sort();
  let failed = 0;
  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(path.join(dir, file)).href + `?v=${Date.now()}`);
      const c = mod.command;
      if (!c?.name || typeof c.run !== "function") throw new Error("Missing command.name or command.run");
      const names = [c.name, ...(c.aliases || [])].map(x => String(x).toLowerCase()).filter(Boolean);
      for (const name of names) {
        if (commands.has(name)) throw new Error(`Duplicate command/alias: ${name}`);
        commands.set(name, c);
      }
      if (!c.hidden) {
        const cat = c.category || "OTHER";
        if (!categories.has(cat)) categories.set(cat, []);
        categories.get(cat).push(c);
      }
    } catch (err) {
      failed++;
      console.error(`[COMMANDS] Failed: ${file}`, err);
    }
  }
  loaded = true;
  console.log(`[COMMANDS] Loaded: ${commands.size} | Failed files: ${failed}`);
  return { loaded: commands.size, failed };
}
