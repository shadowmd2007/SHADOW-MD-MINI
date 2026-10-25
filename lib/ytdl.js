// lib/ytdl.js - FIXED
import { get, findUrl, downloadUrl as first, getBuffer } from './api.js';

const u = (url) => encodeURIComponent(url);

function endpoints(url, type) {
  const list = [];
  list.push(async () => {
    const r = await get(`https://api.siputzx.my.id/api/d/ytmp3?url=${u(url)}`);
    return findUrl(r);
  });
  list.push(async () => {
    const r = await get(`https://api.vreden.my.id/api/ytmp3?url=${u(url)}`);
    return findUrl(r);
  });
  list.push(async () => {
    const r = await get(`https://api.ryzendesu.vip/api/downloader/ytmp3?url=${u(url)}`);
    return findUrl(r);
  });

  if (type === 'mp4' || type === 'video') {
    list.push(async () => {
      const r = await get(`https://api.ryzendesu.vip/api/downloader/ytmp4?url=${u(url)}`);
      return findUrl(r);
    });
  }

  return list;
}

async function ytdlCore(url, type = 'mp3') {
  const link = await first(endpoints(url, type));
  if (!link) throw new Error('No link found');
  return link;
}

export async function download(url, type = 'mp3') {
  const link = await ytdlCore(url, type);
  try {
    const buf = await getBuffer(link);
    if (!buf || buf.length < 500) throw new Error('Bad file');
    return buf;
  } catch {
    throw new Error('Download failed');
  }
}

export const ytdl = ytdlCore;