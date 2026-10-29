import fs from 'node:fs';
import path from 'node:path';

const dbPath = path.resolve('./data/antidelete.json');

function readDb() {
  try {
    return { enabled: !!JSON.parse(fs.readFileSync(dbPath, 'utf8')).enabled };
  } catch {
    return { enabled: false };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify({ enabled: !!db.enabled, ownerJid: null }, null, 2));
}

export const command = {
  name: 'antidelete',
  aliases: ['antidel', 'ad'],
  category: 'OWNER',
  owner: true,
  description: 'Send deleted-message copies to bot owner personal chat',

  run: async (ctx) => {
    const arg = String(ctx.args[0] || '').toLowerCase();
    const db = readDb();

    if (arg === 'on') {
      db.enabled = true;
      writeDb(db);
      return ctx.reply('✅ *Antidelete ON*\nDeleted messages will be sent to the bot owner personal chat only.');
    }

    if (arg === 'off') {
      db.enabled = false;
      writeDb(db);
      return ctx.reply('❌ *Antidelete OFF*');
    }

    return ctx.reply(`*ANTIDELETE:* ${db.enabled ? 'ON ✅' : 'OFF ❌'}\nUse: ${ctx.prefix}antidelete on / off`);
  }
};