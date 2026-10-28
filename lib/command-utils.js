// Error class jo index.js mang raha hai
class CommandError extends Error {
    constructor(message, commandName = "unknown") {
        super(message);
        this.name = "CommandError";
        this.commandName = commandName;
    }
}

// Baaki saare functions
function loadCommands() {
    const fs = require("fs");
    const path = require("path");
    const commands = new Map();
    const commandPath = path.join(__dirname, "../plugins");

    try {
        if (!fs.existsSync(commandPath)) return commands;
        const files = fs.readdirSync(commandPath).filter(f => f.endsWith(".js"));
        for (const file of files) {
            try {
                const cmd = require(path.join(commandPath, file));
                if (cmd.name) commands.set(cmd.name, cmd);
            } catch {}
        }
    } catch {}
    return commands;
}

function handleCommandError(err, command) {
    console.error(`❌ Command Error in ${command}:`, err.message);
    return new CommandError(err.message, command);
}

module.exports = {
    CommandError,
    loadCommands,
    handleCommandError
};