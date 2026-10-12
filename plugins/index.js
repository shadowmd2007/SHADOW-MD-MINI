import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = new Map();
const commandsPath = path.join(__dirname, "../commands");

console.log("Loading commands from:", commandsPath);

const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

for (const file of files) {
  try {
    const fullPath = path.join(commandsPath, file);
    const fileUrl = pathToFileURL(fullPath).href;
    const mod = await import(fileUrl);
    const cmd = mod.default || mod;
    if (cmd && cmd.name) {
      commands.set(cmd.name.toLowerCase(), cmd);
      console.log(`+ Loaded: ${cmd.name}`);
    }
  } catch (err) {
    console.log(`- Failed ${file}: ${err.message}`);
  }
}

console.log(`✅ Total Loaded: ${commands.size} commands`):