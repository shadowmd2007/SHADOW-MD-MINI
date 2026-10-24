import fs from 'fs';
import config from '../config.js';

fs.mkdirSync('./data', { recursive: true });
const FILE = './data/settings.json';

const defaults = {
  prefix: config.prefix,
  mode: config.mode,
  botName: config.botName,
  ownerName: config.ownerName,
  antidelete: true,
  antiviewonce: true,
  antilink: {},
  antistatus: {},
  welcome: {},
  goodbye: {},
  warns: {},
  banned: [],
  sudo: [],
  autorecording: false,
  autotyping: false,
  autoreact: false,
  statusview: true,
  statusreact: false,
  statusEmoji: '❤️',
  online: true,
  chatbot: false,
};

let data = { ...defaults };
try { data = { ...defaults, ...JSON.parse(fs.readFileSync(FILE, 'utf8')) }; } catch {}

let timer;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFile(FILE, JSON.stringify(data, null, 2), () => {}), 400);
}

export const store = {
  get: (k) => data[k],
  set(k, v) { data[k] = v; save(); return v; },
  all: () => data,
  sub: (k, id) => (data[k] || {})[id],
  setSub(k, id, v) { data[k] = data[k] || {}; data[k][id] = v; save(); return v; },
  delSub(k, id) { if (data[k]) { delete data[k][id]; save(); } },
};

// message cache (antidelete / viewonce)
export const cache = new Map();
export function cacheMsg(m) {
  if (!m?.key?.id) return;
  cache.set(m.key.id, m);
  if (cache.size > 4000) cache.delete(cache.keys().next().value);
}

export default store;
