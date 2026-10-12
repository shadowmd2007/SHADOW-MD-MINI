import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const commands = new Map();

function loadCommands(dir) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      loadCommands(fullPath);
    } else if (item.endsWith(".js")) {
      try {
        const fileUrl = pathToFileURL(fullPath).href + `?t=${Date.now()}`;
        import(fileUrl).then(mod => {
          const cmd = mod.default || mod;
          if (cmd && cmd.name) {
            commands.set(cmd.name.toLowerCase(), cmd);
          }
        });
      } catch (e) {
        console.log(`Error ${item}: ${e.message}`);
      }
    }
  }
}

// Sync load for first time
const commandsPath = path.join(__dirname, "../commands");
const files = fs.readdirSync(commandsPath);
for (const file of files) {
  if (!file.endsWith(".js")) continue;
  try {
    const filePath = path.join(commandsPath, file);
    const fileUrl = pathToFileURL(filePath).href;
    const mod = await import(fileUrl);
    const cmd = mod.default || mod;
    if (cmd && cmd.name) {
      commands.set(cmd.name.toLowerCase(), cmd);
    }
  } catch (e) {
    console.log(`❌ ${file}: ${e.message}`);
  }
}
console.log(`✅ Loaded ${commands.size} commands`);