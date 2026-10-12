import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = new Map();

export async function loadCommands() {
  const commandsPath = path.join(__dirname, "../commands");
  console.log("Checking path: " + commandsPath);

  if (!fs.existsSync(commandsPath)) {
    console.log("❌ commands folder not found!");
    return commands;
  }

  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));
  console.log(`Found ${files.length} files in commands folder`);

  // Clear previous entries so reconnects/reloads don't duplicate stale commands.
  commands.clear();

  for (const file of files) {
    try {
      const fullPath = path.join(commandsPath, file);
      const mod = await import(pathToFileURL(fullPath).href);

      // Support both formats used in this repository:
      //   export const command = { name, run }
      //   export default { name, run }
      const cmd = mod.default || mod.command || mod;

      if (!cmd || !cmd.name) {
        console.log(`- Skipped ${file} (no name export)`);
        continue;
      }

      // Normalize aliases so the handler can safely resolve alternate names.
      const aliases = cmd.aliases || cmd.alias || [];
      cmd.aliases = Array.isArray(aliases)
        ? aliases.map(alias => String(alias).toLowerCase())
        : [];

      // Only register runnable commands. The main handler has built-in menu,
      // ping and alive handlers, so the legacy menu file is still harmless.
      if (typeof cmd.run !== "function" && typeof cmd.execute !== "function") {
        console.log(`- Skipped ${file} (no run/execute function)`);
        continue;
      }

      commands.set(String(cmd.name).toLowerCase(), cmd);
      console.log(`+ Loaded: ${cmd.name}`);
    } catch (err) {
      console.log(`- Failed ${file}: ${err.message}`);
    }
  }

  console.log(`✅ Total Loaded: ${commands.size} commands`);
  return commands;
}
