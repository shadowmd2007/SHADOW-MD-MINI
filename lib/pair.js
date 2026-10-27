// 🌹 RANA FURQAN MD - PAIR.JS

import makeWASocket, {
  useMultiFileAuthState,
  makeCacheableSignalKeyStore
} from '@whiskeysockets/baileys';

import pino from 'pino';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.resolve(__dirname, config.authDir || './auth');
const logger = pino({ level: 'silent' });

export class PairingError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PairingError';
  }
}

export async function createSessionManager(options = {}) {
  const authDir = path.resolve(
    __dirname,
    options.authDir || config.authDir || './auth'
  );

  await fs.promises.mkdir(authDir, { recursive: true });

  const { state, saveCreds } =
    await useMultiFileAuthState(authDir);

  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger)
    },
    logger,
    browser: ['RANA FURQAN MD', 'Chrome', '1.0.0'],
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  return { sock, state, saveCreds, authDir };
}

export async function RANA_FURQAN_PAIR(number = config.ownerNumber) {
  let manager;

  try {
    const cleanNumber = String(number || '').replace(/\D/g, '');

    if (cleanNumber.length < 10) {
      throw new PairingError('Valid WhatsApp number required.');
    }

    manager = await createSessionManager();

    const { sock, state } = manager;

    if (state.creds.registered) {
      throw new PairingError(
        'Session already registered. Use the existing session.'
      );
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    const code = await sock.requestPairingCode(cleanNumber);

    console.log('🌹 RANA FURQAN MD PAIRING CODE:', code);

    return { sock, code, manager };
  } catch (error) {
    throw error instanceof PairingError
      ? error
      : new PairingError(error?.message || 'Pairing failed.');
  }
}

export default RANA_FURQAN_PAIR;