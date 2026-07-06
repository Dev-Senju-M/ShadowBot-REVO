const path = require('path');
const fs   = require('fs');
const { BaseExtractor, Track, QueryType } = require('discord-player');
const YouTube   = require('youtube-sr').default;
const YTDlpWrap = require('yt-dlp-wrap').default;

const LOCAL_YTDLP = path.join(process.cwd(), 'yt-dlp');
const ytdlpBin = fs.existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : undefined;

class YouTubeExtractor extends BaseExtractor {
  static identifier = 'com.shadowbot.youtube';

  async activate() {
    this.protocols = ['ytsearch', 'youtube'];
    this._ytdlp = new YTDlpWrap(ytdlpBin);
  }

  async validate(query, type) {
    return [
      QueryType.YOUTUBE,
      QueryType.YOUTUBE_VIDEO,
      QueryType.YOUTUBE_SEARCH,
      QueryType.YOUTUBE_PLAYLIST,
    ].includes(type);
  }

  async handle(query, context) {
    if (context.type === QueryType.YOUTUBE_VIDEO || context.type === QueryType.YOUTUBE) {
      const video = await YouTube.getVideo(query).catch(() => null);
      if (!video) return this.createResponse();
      return this.createResponse(null, [this._buildTrack(video, context)]);
    }

    if (context.type === QueryType.YOUTUBE_PLAYLIST) {
      const playlist = await YouTube.getPlaylist(query, { fetchAll: true }).catch(() => null);
      if (!playlist) return this.createResponse();
      const tracks = playlist.videos.map(v => this._buildTrack(v, context));
      return this.createResponse(null, tracks);
    }

    const results = await YouTube.search(query, { limit: 5, type: 'video' }).catch(() => []);
    if (!results.length) return this.createResponse();
    return this.createResponse(null, results.map(v => this._buildTrack(v, context)));
  }

  async stream(track) {
    console.log(`[youtube:stream] ${track.title}`);
    try {
      const args = [
        track.url,
        '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
        '--get-url',
        '--no-playlist',
        '--no-warnings',
      ];
      if (process.env.WARP_PROXY_URL) {
        args.push('--proxy', process.env.WARP_PROXY_URL);
      }
      const output = await this._ytdlp.execPromise(args);
      const url = output.trim().split('\n')[0];
      if (!url || !url.startsWith('http')) throw new Error(`URL inválida: "${url}"`);
      console.log('[youtube:stream] URL OK' + (process.env.WARP_PROXY_URL ? ' (vía proxy)' : ''));
      return url;
    } catch (e) {
      console.error('[youtube:stream]', e.message);
      throw e;
    }
  }

  createBridgeQuery(track) {
    return `${track.author} - ${track.title}`;
  }

  _buildTrack(video, context) {
    const track = new Track(this.context.player, {
      title:       video.title ?? 'Desconocido',
      author:      video.channel?.name ?? 'Desconocido',
      url:         video.url,
      thumbnail:   video.thumbnail?.url ?? '',
      duration:    video.durationFormatted ?? '0:00',
      views:       video.views ?? 0,
      requestedBy: context.requestedBy,
      source:      'youtube',
      queryType:   context.type,
    });
    track.extractor = this;
    return track;
  }
}

module.exports = YouTubeExtractor;