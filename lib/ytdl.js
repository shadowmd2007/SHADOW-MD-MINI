import { get, getBuffer, findUrl, first } from './api.js';

// Download APIs (community APIs hain, kabhi band ho sakti hain -> isi liye fallback chain)
// Apni API lagani ho to .env mein YT_API likho: https://your-api/dl?url={url}&type={type}
function endpoints(url, type) {
  const u = encodeURIComponent(url);
  const list = [];
  if (process.env.YT_API) list.push(process.env.YT_API.replace('{url}', u).replace('{type}', type));
  if (type === 'mp3') list.push(
    `https://api.siputzx.my.id/api/d/ytmp3?url=${u}`,
    `https://api.vreden.my.id/api/ytmp3?url=${u}`,
    `https://api.agatz.xyz/api/ytmp3?url=${u}`,
    `https://api.ryzendesu.vip/api/downloader/ytmp3?url=${u}`,
  ); else list.push(
    `https://api.siputzx.my.id/api/d/ytmp4?url=${u}`,
    `https://api.vreden.my.id/api/ytmp4?url=${u}`,
    `https://api.agatz.xyz/api/ytmp4?url=${u}`,
    `https://api.ryzendesu.vip/api/downloader/ytmp4?url=${u}`,
  );
  return list;
}

async function viaYtdlCore(url, type) {
  const ytdl = (await import('@distube/ytdl-core')).default;
  const stream = ytdl(url, type === 'mp3'
    ? { filter: 'audioonly', quality: 'highestaudio' }
    : { filter: (f) => f.hasVideo && f.hasAudio && f.container === 'mp4', quality: 'lowest' });
  const chunks = [];
  for await (const c of stream) chunks.push(c);
  return Buffer.concat(chunks);
}

export async function download(url, type = 'mp3') {
  const tasks = endpoints(url, type).map((ep) => async () => {
    const r = await get(ep, { timeout: 45000 });
    const link = findUrl(r);
    if (!link) throw new Error('no link');
    const buf = await getBuffer(link);
    if (buf.length < 5000) throw new Error('bad file');
    return buf;
  });
  tasks.push(() => viaYtdlCore(url, type));
  return first(tasks);
}
