module.exports = {
    name: "feature",
    alias: ["features", "feat"],
    category: "owner",
    desc: "Check bot features",
    
    async execute(sock, m, args) {
        const { getAllFeatures } = require("../lib/feature.js");
        
        try {
            const allFeatures = getAllFeatures();
            let text = "*🤖 BOT FEATURES LIST*\n\n";
            
            for (const [key, value] of Object.entries(allFeatures)) {
                text += `${value ? "✅" : "❌"} ${key}: ${value ? "ON" : "OFF"}\n`;
            }
            
            await sock.sendMessage(m.chat, { text: text }, { quoted: m });
            
        } catch (e) {
            await sock.sendMessage(m.chat, { text: `Error: ${e.message}` }, { quoted: m });
        }
    }
};