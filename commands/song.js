import { command as playCommand } from './play.js';

export const command = {
  ...playCommand,
  name: 'song',
  aliases: ['music', 'mp3'],
  description: 'Search and send audio using the configured public downloader fallbacks',
  run: playCommand.run
};