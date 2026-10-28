const ytdl = require("@distube/ytdl-core");
const ytSearch = require("yt-search");

async function getVideoInfo(url) {
    try {
        if (!ytdl.validateURL(url)) {
            return { status: false, error: "Invalid YouTube URL" };
        }
        const info = await ytdl.getInfo(url);
        return {
            status: true,
            title: info.videoDetails.title,
            thumbnail: info.videoDetails.thumbnails[0].url,
            url: url
        };
    } catch (e) {
        return { status: false, error: e.message };
    }
}

async function searchYouTube(query) {
    try {
        const r = await ytSearch(query);
        return r.videos.slice(0, 5);
    } catch (e) {
        return [];
    }
}

module.exports = { getVideoInfo, searchYouTube };