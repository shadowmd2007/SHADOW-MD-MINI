const fs = require("fs");
const path = require("path");

// Command loader
function loadCommands() {
    const commands = new Map();
    const commandPath = path.join(__dirname, "../commands"); // agar commands folder bahar hai

    // Agar commands folder lib ke andar hai to ye line use karo:
    // const commandPath = path.join(__dirname, "commands");

    try {
        if (!fs.existsSync(commandPath)) {
            console.log("⚠️ commands folder nahi mila, bana raha hun...");
            fs.mkdirSync(commandPath, { recursive: true });
            return commands;
        }

        const files = fs.readdirSync(commandPath).filter(f => f.endsWith(".js"));
        for (const file of files) {
            try {
                const cmd = require(path.join(commandPath, file));
                if (cmd.name) {
                    commands.set(cmd.name, cmd);
                    console.log(`✅ Loaded Command: ${cmd.name}`);
                }
            } catch (e) {
                console.log(`❌ Failed to load ${file}: ${e.message}`);
            }
        }
    } catch (err) {
        console.log("Command loader error:", err.message);
    }
    return commands;
}

module.exports = { loadCommands };