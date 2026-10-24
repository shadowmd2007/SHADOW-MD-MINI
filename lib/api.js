// Sab API calls yahan se guzarti hain: timeout + fallback + crash-proof
const UA = 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36';

async function req(url, { timeout = 20000, method = 'GET', headers = {}, body } = {}) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeout);
  try {
    const r = await fetch(url, { method, headers: { 'user-agent': UA, ...headers }, body, signal: ac.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`API error HTTP ${r.status}`);
    return r;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('API timeout, dobara try karo');
    throw e;
  } finally { clearTimeout(t); }
}

export async function get(url, o = {}) {
  const r = await req(url, o);
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { return txt; }
}

export async function getBuffer(url, o = {}) {
  const r = await req(url, { timeout: 90000, ...o });
  return Buffer.from(await r.arrayBuffer());
}

export async function post(url, json, o = {}) {
  return get(url, { method: 'POST', body: JSON.stringify(json), ...o, headers: { 'content-type': 'application/json', ...(o.headers || {}) } });
}

// tasks = [async()=>..., ...]  -> pehli kamyab wali return hoti hai
export async function first(tasks) {
  let last;
  for (const t of tasks) {
    try { const v = await t(); if (v) return v; } catch (e) { last = e; }
  }
  throw last || new Error('Sab APIs fail ho gayin, baad mein try karo');
}

// JSON ke andar se pehla download link dhoondta hai (alag alag APIs ke liye)
export function findUrl(obj, depth = 0) {
  if (!obj || depth > 5) return null;
  if (typeof obj === 'string') return /^https?:\/\//.test(obj) ? obj : null;
  if (typeof obj !== 'object') return null;
  const keys = ['download_url', 'downloadUrl', 'download', 'dl', 'url', 'link', 'result', 'data', 'mp3', 'mp4', 'audio', 'video'];
  for (const k of keys) { if (obj[k]) { const r = findUrl(obj[k], depth + 1); if (r) return r; } }
  for (const v of Object.values(obj)) { const r = findUrl(v, depth + 1); if (r) return r; }
  return null;
}

// AI (chatbot / chatgpt). OPENAI_API_KEY ho to wo, warna free endpoint.
// AI_API_URL custom: https://example.com/ai?q={q}
export async function ai(prompt, system = 'You are SHADOW MD, a friendly WhatsApp assistant made by RANA FURQAN. Reply short, in the same language as the user (Roman Urdu / English).') {
  const key = process.env.OPENAI_API_KEY;
  const tasks = [];
  if (key) tasks.push(async () => {
    const r = await post('https://api.openai.com/v1/chat/completions',
      { model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages: [{ role: 'system', content: system }, { role: 'user', content: prompt }] },
      { headers: { authorization: `Bearer ${key}` }, timeout: 40000 });
    return r.choices?.[0]?.message?.content;
  });
  if (process.env.AI_API_URL) tasks.push(async () => {
    const r = await get(process.env.AI_API_URL.replace('{q}', encodeURIComponent(prompt)), { timeout: 40000 });
    return typeof r === 'string' ? r : (r.result || r.response || r.message || r.data || JSON.stringify(r));
  });
  tasks.push(async () => {
    const r = await get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(system)}`, { timeout: 45000 });
    return typeof r === 'string' ? r : (r.content || JSON.stringify(r));
  });
  return String(await first(tasks)).trim();
}
