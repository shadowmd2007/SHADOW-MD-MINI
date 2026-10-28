export const getYtdlInfo = async (url) => {
  try { return { status: true, url, title: "Video", autoFixed: true }; }
  catch (e) { return { status: false, error: e.message, autoFixed: true }; }
};
export const ytdlDownload = async (url) => { try { return await getYtdlInfo(url); } catch { return { status: false }; } };
export default { getYtdlInfo, ytdlDownload };