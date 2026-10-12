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

  for (const file of files) {
    try {
      const fullPath = path.join(commandsPath, file);
      const fileUrl = pathToFileURL(fullPath).href;
      const mod = await import(fileUrl);
      
      // Har tarah ka export handle karega
      const cmd = mod.default || mod;
      
      if (cmd && cmd.name) {
        commands.set(cmd.name.toLowerCase(), cmd);
        console.log(`+ Loaded: ${cmd.name}`);
      } else {
        console.log(`- Skipped ${file} (no name export)`);
      }
    } catch (err) {
      console.log(`- Failed ${file}: ${err.message}`);
    }
  }
  
  console.log(`✅ Total Loaded: ${commands.size} commands`);
  return commands;
}