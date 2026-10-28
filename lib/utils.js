export const sleep = (ms) => new Promise(r => { try { setTimeout(r, ms); } catch { r(); } });
export const clockString = (ms) => {
  try {
    let h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
    return [h, m, s].map(v => v.toString().padStart(2, 0)).join(":");
  } catch { return "00:00:00"; }
};
export const runtime = (s) => {
  try {
    s = Number(s); let d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60), sec = Math.floor(s % 60);
    return `${d}d ${h}h ${m}m ${sec}s`;
  } catch { return "0d 0h 0m 0s"; }
};
export default { sleep, clockString, runtime };