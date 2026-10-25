// lib/store.js - FIXED
import fs from 'fs';
import config from '../config.js';

const FILE = './data/settings.json';
try { fs.mkdirSync('./data', { recursive: true }); } catch {}

const defaults = {
  mode: config.mode || 'public',
  prefix: config.prefix || '.',
  botName: config.botName || 'SHADOW MD',
  ownerName: config.ownerName || 'RANA FURQAN',
  antiDelete: true,
  antiViewOnce: true,
  antiStatus: [],
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
  sudo: []
};

let data = { ...defaults };

if (fs.existsSync(FILE)) {
  try {
    data = { ...defaults, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) };
  } catch {}
}

let timer = null;

function save() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
  }, 400);
}

const store = {
  get: (k) => data[k],

  set: (k, v) => {
    data[k] = v;
    save();
    return v;
  },

  sub: (k, id) => {
    if (!data[k]) data[k] = [];
    if (!data[k].includes(id)) {
      data[k].push(id);
      save();
    }
    return data[k];
  },

  unsub: (k, id) => {
    if (data[k]) {
      data[k] = data[k].filter(x => x !== id);
      save();
    }
    return data[k];
  },

  all: () => data
};

export const cache = new Map();
export const cacheMsg = new Map();

export default store;