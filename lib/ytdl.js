// This helper intentionally does not claim that a URL is downloadable.
// Use commands/play.js or commands/video.js, which query actual downloader APIs.
export async function getYtdlInfo(url) {
  if (!/^https?:\/\//i.test(String(url || ''))) {
    return { status: false, error: 'A valid HTTP(S) URL is required.' };
  }
  return {
    status: false,
    url,
    error: 'No verified generic download-info API is configured. Use .play or .video instead.'
  };
}
export async function ytdlDownload(url) { return getYtdlInfo(url); }
export default { getYtdlInfo, ytdlDownload };