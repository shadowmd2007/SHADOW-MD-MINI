import fs from 'fs';
import config from '../config.js';

const FILE = './data/settings.json';
fs.mkdirSync('./data', { recursive: true });

const defaults = {
  mode: config.mode || 'public',
  prefix: config.prefix || '.',
  botName: config.botName || 'SHADOW MD',
  ownerName: config.ownerName || 'RANA FURQAN',
  antiDelete: true,
  antiViewOnce: true,
  antiStatus: {},
  welcome: [],
  goodbye: [],
  autoRecording: false,
  autoTyping: false,
  autoReact: false,
  statusView: true,
  statusReact: false,
  online: true,
  chatbot: false,
  banned: [],
  sudo: [],
  statusEmoji: '❤️'
};

let data = { ...defaults };
try {
  if (fs.existsSync(FILE)) {
    data = { ...defaults, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  }
} catch {}

let timer;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  }, 400);
}

const store = {
  get: (k) => data[k],
  set: (k, v) => { data[k] = v; save(); return v; },
  sub: (k, id, v) => {
    if (!data[k]) data[k] = {};
    if (v === undefined) return data[k][id];
    data[k][id] = v;
    save();
    return v;
  },
  all: () => data,
};

export const cache = new Map();
export const cacheMsg = new Map();
export default store;