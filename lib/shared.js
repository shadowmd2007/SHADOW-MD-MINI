import config from '../config.js';

// Shared runtime settings used by the command router.
export const settings = {
  prefix: config.prefix || '.',
  mode: config.mode || 'public',
  ownerNumber: String(config.ownerNumber || process.env.OWNER_NUMBER || '').replace(/[^0-9,]/g, ''),
  botName: config.botName || 'RANA FURQAN MD',
  ownerName: config.ownerName || 'RANA FURQAN'
};

export default settings;