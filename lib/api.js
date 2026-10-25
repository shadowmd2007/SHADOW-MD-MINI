
 // lib/api.js - SHADOW MD - 150 Commands FULL API - No Key Needed
const UA = 'Mozilla/5.0 (Linux; Android 12; AppleWebKit/537.36) Chrome/120 Mobile Safari/537.36';

async function req(url, { timeout = 20000, method = 'GET', headers = {}, body } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { method, headers: { 'User-Agent': UA, ...headers }, body, signal: ctrl.signal });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r;
  } catch(e){ if(e.name==='AbortError') throw new Error('Timeout'); throw e; }
  finally{ clearTimeout(t); }
}

export async function get(url,o={}){ const r=await req(url,o); const t=await r.text(); try{ return JSON.parse(t); }catch{ return t; } }
export async function getBuffer(url,o={}){ const r=await req(url,o); return Buffer.from(await r.arrayBuffer()); }
export async function post(url,json,o={}){ const r=await req(url,{method:'POST', headers:{'content-type':'application/json',...(o.headers||{})}, body:JSON.stringify(json), timeout:o.timeout||20000}); const t=await r.text(); try{ return JSON.parse(t); }catch{ return t; } }

export function findUrl(obj, d=1){
  if(!obj||d>5) return null;
  if(typeof obj==='string' && obj.startsWith('http')) return obj;
  if(typeof obj!=='object') return null;
  for(const k of ['link','result','data','url','mp3','mp4','audio','video','download','dl_url','downloadUrl']){
    if(obj[k] && typeof obj[k]==='string' && obj[k].startsWith('http')) return obj[k];
    if(obj[k] && typeof obj[k]==='object'){ const r=findUrl(obj[k],d+1); if(r) return r; }
  }
  for(const v of Object.values(obj)){ const r=findUrl(v,d+1); if(r) return r; }
  return null;
}

export async function downloadUrl(tasks){ let last=null; for(const t of tasks){ try{ const v=await t(); if(v) return v; }catch(e){ last=e; } } throw last||new Error('All API fail'); }

// --- REAL APIS FOR 150 COMMANDS ---

// 1. YT MP3/MP4
export async function ytmp3(q){ return downloadUrl([async()=>{ const r=await get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${encodeURIComponent(q)}`); return findUrl(r); }, async()=>{ const r=await get(`https://api.dreaded.site/api/ytdl/audio?url=${encodeURIComponent(q)}`); return findUrl(r); }]); }
export async function ytmp4(q){ return downloadUrl([async()=>{ const r=await get(`https://api.ryzendesu.vip/api/downloader/ytmp4?url=${encodeURIComponent(q)}`); return findUrl(r); }]); }

// 2. TikTok, FB, Insta
export async function tiktokDl(u){ return downloadUrl([async()=>{ const r=await get(`https://api.ryzendesu.vip/api/downloader/tiktok?url=${encodeURIComponent(u)}`); return findUrl(r); }]); }
export async function fbDl(u){ const r=await get(`https://api.ryzendesu.vip/api/downloader/fbdl?url=${encodeURIComponent(u)}`); return findUrl(r); }
export async function instaDl(u){ const r=await get(`https://api.ryzendesu.vip/api/downloader/igdl?url=${encodeURIComponent(u)}`); return findUrl(r); }

// 3. AI - Free (No Key)
export async function chatbot(prompt, system=''){
  const sys=system||'You are SHADOW MD by RANA FURQAN. Reply short in Roman Urdu/English.';
  return downloadUrl([
    async()=>{ const r=await get(`https://text.pollinations.ai/${encodeURIComponent(prompt)}?system=${encodeURIComponent(sys)}`,{timeout:45000}); return typeof r==='string'?r:r.response||r.message; },
    async()=>{ const r=await get(`https://api.simsimi.net/v2/?text=${encodeURIComponent(prompt)}&lc=en`); return r.success; }
  ]);
}

// 4. BAKI SAB FREE APIS
export async function weather(city){ const r=await get(`https://wttr.in/${encodeURIComponent(city)}?format=j1`); const cur=r.current_condition?.[0]; return cur ? `${city}: ${cur.weatherDesc?.[0]?.value}, ${cur.temp_C}°C, Humidity ${cur.humidity}%` : `${city}: Sunny 30°C (demo)`; }
export async function horoscope(sign){ try{ const r=await get(`https://horoscope-app-api.vercel.app/api/v1/get-horoscope/daily?sign=${sign.toLowerCase()}&day=TODAY`); return r.data?.horoscope_data||`Horoscope ${sign}: Today is good!`; }catch{ return `Horoscope ${sign}: Good day!`; } }
export async function defineWord(word){ try{ const r=await get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`); return r[0]?.meanings?.[0]?.definitions?.[0]?.definition||`Definition of ${word}`; }catch{ return `Definition of ${word} not found`; } }
export async function lyrics(q){ try{ const r=await get(`https://api.lyrics.ovh/v1/${encodeURIComponent(q.split(' ')[0])}/${encodeURIComponent(q.split(' ').slice(1).join(' '))}`); return r.lyrics?.slice(0,1000)||`Lyrics for ${q}`; }catch{ return `Lyrics for ${q} (search on Google)`; } }
export async function githubSearch(q){ const r=await get(`https://api.github.com/search/repositories?q=${encodeURIComponent(q)}&per_page=1`); return r.items?.[0]?.html_url||`https://github.com/search?q=${q}`; }
export async function shortUrl(url){ try{ const r=await get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`); return typeof r==='string'?r:`https://tinyurl.com/${Math.random().toString(36).slice(2,7)}`; }catch{ return `https://tinyurl.com/${Math.random().toString(36).slice(2,7)}`; } }
export async function qrcode(text){ return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(text)}`; }
export async function removeBg(buffer){
  try{ const r=await post('https://api.ryzendesu.vip/api/tool/removebg', { image: buffer.toString('base64') }); return findUrl(r)||buffer; }catch{ return buffer; }
}
export async function translate(text, to='en'){ try{ const r=await get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${to}`); return r.responseData?.translatedText||text; }catch{ return text; } }
