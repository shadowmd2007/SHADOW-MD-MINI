export default {
  name: "menu",
  alias: ["allmenu", "help", "list"],
  category: "general",
  desc: "Show all commands",
  async execute(m, { commands }) {
    try {
      let total = commands.size;
      let menuText = "*SHADOW MD*\n";
      menuText += `OWNER: RANA FURQAN\n`;
      menuText += `PREFIX: .\n`;
      menuText += `COMMANDS: ${total}\n\n`;

      for (let [name] of commands) {
        menuText += `.${name}\n`;
      }

      menuText += `\nPowered by SHADOW MD`;
      await m.reply(menuText);
    } catch (e) {
      await m.reply("Menu Error: " + e.message);
    }
  }
}