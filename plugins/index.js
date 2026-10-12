import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const commands = new Map();

export async function loadCommands() {
  // Saare possible paths check karega
  const possiblePaths = [
    path.join(__dirname, "../commands"),
    path.join(__dirname),
    path.join(process.cwd(), "commands"),
    path.join(process.cwd(), "plugins"),
    path.join(__dirname, "../plugins")
  ];

  let commandsPath = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      const files = fs.readdirSync(p).filter(f => f.endsWith(".js") && f !== "index.js");
      if (files.length > 5) { // Jahan 5 se zyada files hon wahi commands folder hai
        commandsPath = p;
        break;
      }
    }
  }

  if (!commandsPath) {
    console.log("❌ Commands folder not found in any path!");
    return commands;
  }

  console.log("✅ Found commands at: " + commandsPath);

  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js") && f !== "index.js");

  for (const file of files) {
    try {
      const fullPath = path.join(commandsPath, file);
      const fileUrl = pathToFileURL(fullPath).href + "?t=" + Date.now();
      const mod = await import(fileUrl);
      const cmd = mod.default || mod;
      if (cmd && cmd.name) {
        commands.set(cmd.name.toLowerCase(), cmd);
      }
    } catch (err) {
      console.log("Failed " + file + ": " + err.message);
    }
  }

  console.log("✅ Total Loaded: " + commands.size + " commands");
  return commands;
}

// Auto load bhi kar do taake menu me show ho
await loadCommands();