
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export let settings = { prefix: '.' };

export const autoCommands = new Map();
export const autoAliases = new Map();

const messageCache = new Map();
const deletedCache = new Set();
const hookedSockets = new WeakSet();

let router = null;
let loadPromise = null;
let lastLoad = 0;

const SETTINGS_FILE = path.join(__dirname, 'handler-settings.json');
const COMMANDS_DIR = path.join(__dirname, 'commands');

const DEFAULT_SETTINGS = {
  prefix: '.',
  antidelete: true,
  autoreact: false,
  autostatus: false,
  statusview: false,
  statuslike: false
};

let featureSettings = { ...DEFAULT_SETTINGS };

try {
  if (fs.existsSync(SETTINGS_FILE)) {
    featureSettings = {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'))
    };
  }
} catch {}

function saveSettings() {
  try {
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify(featureSettings, null, 2)
    );
  } catch (e) {
    console.log('[SETTINGS]', e.message);
  }
}

function normalizeJid(value) {
  if (!value) return null;

  const raw = String(value).trim();

  if (raw.includes('@')) return raw;

  const number = raw.replace(/\D/g, '');
  return number ? `${number}@s.whatsapp.net` : null;
}

function getOwner(sock) {
  const owner =
    process.env.OWNER_NUMBER ||
    settings?.ownerNumber ||
    settings?.owner ||
    settings?.ownerNumber;

  const jid = normalizeJid(owner);
  if (jid) return jid;

  return null;
}

function getText(message) {
  const m = message?.message;
  if (!m) return '';

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.ephemeralMessage?.message?.conversation ||
    m.ephemeralMessage?.message?.extendedTextMessage?.text ||
    m.viewOnceMessage?.message?.conversation ||
    m.viewOnceMessageV2?.message?.conversation ||
    ''
  ).trim();
}

function unwrapMessage(message) {
  let current = message;

  for (let i = 0; i < 8 && current; i++) {
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }

    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }

    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }

    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }

    break;
  }

  return current || message;
}

function getQuoted(message) {
  const m = message?.message || {};

  const context =
    m.extendedTextMessage?.contextInfo ||
    m.imageMessage?.contextInfo ||
    m.videoMessage?.contextInfo ||
    m.documentMessage?.contextInfo ||
    m.ephemeralMessage?.message?.extendedTextMessage?.contextInfo;

  if (!context) return null;

  const quotedId = context.stanzaId;
  const quotedParticipant = context.participant;
  const remoteJid = message.key?.remoteJid;

  let cached = quotedId ? messageCache.get(quotedId) : null;

  if (!cached && context.quotedMessage) {
    cached = {
      key: {
        id: quotedId,
        remoteJid,
        participant: quotedParticipant
      },
      message: context.quotedMessage
    };
  }

  return cached || null;
}

function isViewOnce(message) {
  const m = message?.message || message || {};

  return Boolean(
    m.viewOnceMessage ||
    m.viewOnceMessageV2 ||
    m.viewOnceMessageV2Extension ||
    m.ephemeralMessage?.message?.viewOnceMessage ||
    m.ephemeralMessage?.message?.viewOnceMessageV2
  );
}

function getMediaContent(message) {
  const m = unwrapMessage(message?.message || message);

  if (!m) return null;

  if (m.imageMessage) {
    return {
      image: { ...m.imageMessage, viewOnce: false },
      caption: m.imageMessage.caption || ''
    };
  }

  if (m.videoMessage) {
    return {
      video: { ...m.videoMessage, viewOnce: false },
      caption: m.videoMessage.caption || ''
    };
  }

  if (m.audioMessage) {
    return {
      audio: { ...m.audioMessage, viewOnce: false },
      mimetype: m.audioMessage.mimetype || 'audio/ogg',
      ptt: Boolean(m.audioMessage.ptt)
    };
  }

  return null;
}

function rememberMessage(message) {
  const id = message?.key?.id;
  if (!id || !message.message) return;

  messageCache.set(id, message);

  // Cache ko limited rakhein.
  while (messageCache.size > 1500) {
    const oldest = messageCache.keys().next().value;
    messageCache.delete(oldest);
  }
}

async function sendOwner(sock, content) {
  const owner = getOwner(sock);

  if (!owner) {
    console.log(
      '[HANDLER] OWNER_NUMBER set nahi hai; owner DM skip hua.'
    );
    return false;
  }

  await sock.sendMessage(owner, content);
  return true;
}

async function recoverViewOnce(sock, message, mode) {
  const quoted = getQuoted(message);

  if (!quoted) {
    await sock.sendMessage(
      message.key.remoteJid,
      {
        text:
          '⚠️ Pehle one-time photo/video/voice ko reply karein, phir .vv, .vv2 ya .vv3 likhein.'
      },
      { quoted: message }
    );
    return;
  }

  const content = getMediaContent(quoted);

  if (!content) {
    await sock.sendMessage(
      message.key.remoteJid,
      {
        text:
          '❌ Media available nahi hai ya supported format mein nahi mili.'
      },
      { quoted: message }
    );
    return;
  }

  let target;

  if (mode === 'vv3') {
    const group = quoted.key?.remoteJid?.endsWith('@g.us');
    target = group
      ? quoted.key?.participant
      : quoted.key?.remoteJid;
  } else {
    target = getOwner(sock);
  }

  if (!target) {
    await sock.sendMessage(
      message.key.remoteJid,
      {
        text:
          '❌ Recipient nahi mila. OWNER_NUMBER ko Railway Variables mein set karein.'
      },
      { quoted: message }
    );
    return;
  }

  await sock.sendMessage(target, content);

  if (mode !== 'vv3' && target === message.key.remoteJid) {
    return;
  }

  await sock.sendMessage(
    message.key.remoteJid,
    {
      text:
        mode === 'vv3'
          ? '✅ Media original sender ko bhejne ki request complete hui.'
          : '✅ Media owner ke personal chat mein bhej di gayi.'
    },
    { quoted: message }
  );
}

function extractCommandModule(mod) {
  const found = [];

  if (mod.command?.name) found.push(mod.command);
  if (mod.default?.name) found.push(mod.default);

  if (Array.isArray(mod.commands)) {
    found.push(...mod.commands);
  }

  if (Array.isArray(mod.default?.commands)) {
    found.push(...mod.default.commands);
  }

  if (
    mod.name &&
    !found.some((cmd) => cmd.name === mod.name)
  ) {
    found.push(mod);
  }

  return [...new Set(found)].filter((cmd) => cmd?.name);
}

export async function loadAutoCommands() {
  autoCommands.clear();
  autoAliases.clear();

  if (!fs.existsSync(COMMANDS_DIR)) {
    fs.mkdirSync(COMMANDS_DIR, { recursive: true });
  }

  const files = fs.readdirSync(COMMANDS_DIR)
    .filter((file) => file.endsWith('.js'));

  let total = 0;

  for (const file of files) {
    try {
      const fullPath = path.join(COMMANDS_DIR, file);
      const url =
        pathToFileURL(fullPath).href +
        `?update=${Date.now()}_${Math.random()}`;

      const mod = await import(url);
      const commands = extractCommandModule(mod);

      for (const cmd of commands) {
        const name = String(cmd.name).toLowerCase();
        autoCommands.set(name, cmd);

        for (const alias of cmd.aliases || []) {
          autoAliases.set(String(alias).toLowerCase(), name);
        }

        total++;
        console.log(`[AUTO] Loaded: ${name}`);
      }

      if (!commands.length) {
        console.log(`[AUTO] Skipped ${file}: command export nahi mila`);
      }
    } catch (e) {
      console.log(`[AUTO] ${file}: ${e.message}`);
    }
  }

  lastLoad = Date.now();
  return total;
}

async function loadRouter(force = false) {
  if (router && !force) return router;

  try {
    const file = path.join(__dirname, 'commands.js');
    const url = pathToFileURL(file).href + `?update=${Date.now()}`;

    router = await import(url);
    settings =
      router.settings ||
      router.default?.settings ||
      settings ||
      { prefix: '.' };
  } catch (e) {
    console.log('[HANDLER] commands.js:', e.message);
    router = null;
  }

  return router;
}

export async function loadCommands() {
  await loadRouter(true);

  const autoCount = await loadAutoCommands();
  console.log(`[HANDLER] ${autoCount} auto commands loaded`);

  return autoCount;
}

function isOwnerMessage(sock, message) {
  const owner = getOwner(sock);
  const sender =
    message.key?.participant ||
    message.key?.remoteJid;

  return Boolean(owner && sender && normalizeJid(sender) === owner);
}

async function handleFeatureCommand(sock, message, command, args) {
  const jid = message.key.remoteJid;
  const prefix = command.prefix || settings?.prefix || '.';

  if (
    ['autoreact', 'autostatus', 'statusview', 'statuslike', 'antidelete']
      .includes(command.name) &&
    !isOwnerMessage(sock, message)
  ) {
    await sock.sendMessage(
      jid,
      { text: '❌ Yeh setting sirf bot owner change kar sakta hai.' },
      { quoted: message }
    );
    return true;
  }

  const featureMap = {
    autoreact: 'autoreact',
    autostatus: 'autostatus',
    statusview: 'statusview',
    statuslike: 'statuslike',
    antidelete: 'antidelete'
  };

  if (featureMap[command.name]) {
    const feature = featureMap[command.name];
    const value = (args[0] || '').toLowerCase();

    if (!['on', 'off'].includes(value)) {
      await sock.sendMessage(
        jid,
        {
          text:
            `Usage: ${prefix}${command.name} on\n` +
            `Usage: ${prefix}${command.name} off\n` +
            `Current: ${featureSettings[feature] ? 'ON' : 'OFF'}`
        },
        { quoted: message }
      );
      return true;
    }

    featureSettings[feature] = value === 'on';
    saveSettings();

    await sock.sendMessage(
      jid,
      {
        text: `✅ ${command.name}: ${value.toUpperCase()}`
      },
      { quoted: message }
    );
    return true;
  }

  return false;
}

async function runAutoCommand(sock, message, text, prefix) {
  const parts = text.slice(prefix.length).trim().split(/\s+/);
  const requested = (parts.shift() || '').toLowerCase();
  const args = parts;

  if (!requested) return false;

  const actual = autoAliases.get(requested) || requested;
  const cmd = autoCommands.get(actual);

  if (!cmd) return false;

  const jid = message.key.remoteJid;
  const sender = message.key.participant || jid;
  const owner = getOwner(sock);
  const isGroup = jid.endsWith('@g.us');
  const quoted = getQuoted(message);

  const reply = async (content) => {
    const payload =
      typeof content === 'string' ? { text: content } : content;

    return sock.sendMessage(jid, payload, { quoted: message });
  };

  const ctx = {
    sock,
    conn: sock,
    m: message,
    msg: message,
    jid,
    remote: jid,
    args,
    text: args.join(' '),
    cmd: actual,
    prefix,
    config: settings,
    settings,
    content: message.message,
    isGroup,
    isOwner: Boolean(owner && normalizeJid(sender) === owner),
    sender,
    senderJid: sender,
    senderNum: sender.split('@')[0],
    botJid: sock.user?.id,
    quoted,
    reply,
    commandList: [...autoCommands.values()]
  };

  if (await handleFeatureCommand(
    sock,
    message,
    { name: actual, prefix },
    args
  )) {
    return true;
  }

  try {
    if (typeof cmd.run === 'function') {
      await cmd.run(ctx);
      return true;
    }

    if (typeof cmd.execute === 'function') {
      await cmd.execute(sock, message, args, {
        commands: autoCommands,
        prefix,
        ...ctx
      });
      return true;
    }

    await reply(`❌ ${actual}: run() ya execute() function nahi mila.`);
  } catch (e) {
    console.log(`[COMMAND ERROR] ${actual}:`, e);
    await reply(`❌ Command error: ${actual}`);
  }

  return true;
}

function getRevokedKey(update) {
  const protocol =
    update?.update?.message?.protocolMessage ||
    update?.message?.protocolMessage;

  if (!protocol) return null;

  const type = protocol.type;
  const isRevoke =
    type === 0 ||
    String(type).toUpperCase().includes('REVOKE');

  return isRevoke ? protocol.key : null;
}

function attachSocketEvents(sock) {
  if (hookedSockets.has(sock) || !sock.ev) return;

  hookedSockets.add(sock);

  sock.ev.on('messages.update', async (updates) => {
    for (const item of updates || []) {
      try {
        const revokedKey = getRevokedKey(item);
        if (!revokedKey?.id) continue;

        const original = messageCache.get(revokedKey.id);
        if (!original || deletedCache.has(revokedKey.id)) continue;

        deletedCache.add(revokedKey.id);

        if (featureSettings.antidelete) {
          const owner = getOwner(sock);
          if (!owner) continue;

          const content = getMediaContent(original);

          if (content) {
            await sock.sendMessage(owner, content);
          } else {
            const text = getText(original);

            await sock.sendMessage(owner, {
              text:
                `🗑️ *Deleted message*\n` +
                `From: ${original.key.remoteJid}\n` +
                `Message: ${text || '[Media / unsupported message]'}`
            });
          }
        }
      } catch (e) {
        console.log('[ANTIDELETE]', e.message);
      }
    }
  });

  console.log('[HANDLER] Socket events attached');
}

const REACT_EMOJIS = [
  '❤️', '🔥', '😍', '🥰', '😂', '🤣', '😮', '😎', '👏', '💯',
  '✨', '💖', '💕', '💗', '💓', '💞', '😘', '🤩', '🥳', '🙏',
  '💯', '👍', '🙌', '🌹', '🌸', '💐', '🫶', '🤍', '🖤', '💜',
  '💙', '💚', '💛', '🧡', '🤎', '⭐', '🌟', '💫', '😊', '😉',
  '😇', '🤗', '😋', '😜', '😆', '😁', '😃', '😄', '😺', '💝'
];

const PRAISE_WORDS = [
  'mashallah', 'mashaallah', 'subhanallah', 'alhamdulillah',
  'cute', 'nice', 'handsome', 'beautiful', 'lovely', 'amazing',
  'excellent', 'zabardast', 'behtareen', 'behtarin', 'wah',
  'wow', 'best', 'good', 'great', 'awesome', 'super', 'adorable',
  'sweet', 'pretty', 'gorgeous', 'perfect', 'brilliant', 'fantastic',
  'outstanding', 'wonderful', 'cool', 'nice pic', 'so cute',
  'ma sha allah', 'masha allah', 'very nice', 'very beautiful',
  'incredible', 'mind blowing', 'shandar', 'khoobsurat',
  'pyara', 'pyari', 'kamaal', 'wah wah', 'uff', 'queen', 'king',
  'loving', 'excellent pic', 'too good'
];

function containsPraise(text) {
  const lower = text.toLowerCase();
  return PRAISE_WORDS.some((word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|\\W)${escaped}($|\\W)`, 'i').test(lower);
  });
}

export async function onMessage(sock, upsert) {
  attachSocketEvents(sock);

  const currentRouter = await loadRouter();

  if (!autoCommands.size || Date.now() - lastLoad > 60000) {
    await loadAutoCommands();
  }

  for (const message of upsert?.messages || []) {
    if (!message?.message) continue;

    rememberMessage(message);

    const jid = message.key?.remoteJid;
    if (!jid) continue;

    // Status events may arrive separately; do not treat them as commands.
    if (jid === 'status@broadcast') {
      try {
        if (featureSettings.statusview && message.key?.participant) {
          await sock.readMessages([message.key]);
        }

        if (featureSettings.statuslike && message.key?.participant) {
          await sock.sendMessage(
            'status@broadcast',
            { react: { text: '❤️', key: message.key } },
            { statusJidList: [message.key.participant] }
          );
        }
      } catch (e) {
        console.log('[STATUS]', e.message);
      }
      continue;
    }

    const text = getText(message);
    const isGroup = jid.endsWith('@g.us');

    if (message.key.fromMe) continue;

    // Auto-react to normal messages, with praise-word priority.
    if (featureSettings.autoreact && text) {
      try {
        const emoji = containsPraise(text)
          ? '🥰'
          : REACT_EMOJIS[Math.floor(Math.random() * REACT_EMOJIS.length)];

        await sock.sendMessage(jid, {
          react: { text: emoji, key: message.key }
        });
      } catch (e) {
        console.log('[AUTOREACT]', e.message);
      }
    }

    // .vv / .vv2 / .vv3: reply to a view-once media message.
    if (text) {
      const prefix = settings?.prefix || '.';
      const match = text.match(/^[.!#](vv2?|vv3)\b(?:\s+.*)?$/i);

      if (match) {
        const mode = match[1].toLowerCase();

        try {
          await recoverViewOnce(sock, message, mode);
        } catch (e) {
          console.log(`[${mode.toUpperCase()}]`, e.message);

          await sock.sendMessage(
            jid,
            {
              text:
                '❌ Media retrieve nahi ho saki. Agar original media WhatsApp ne bot ko available nahi karwai, handler usay recover nahi kar sakta.'
            },
            { quoted: message }
          );
        }

        continue;
      }

      if (text.startsWith(prefix)) {
        const handled = await runAutoCommand(
          sock,
          message,
          text,
          text[0]
        );

        if (handled) continue;
      }
    }

    // Main commands.js router fallback.
    try {
      if (currentRouter?.handleMessage) {
        await currentRouter.handleMessage(sock, message);
      }
    } catch (e) {
      console.log('[ROUTER ERROR]', e.message);
    }
  }
}

export default {
  onMessage,
  loadCommands,
  loadAutoCommands,
  autoCommands,
  autoAliases,
  settings
};
