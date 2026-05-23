const { BaseExtractor, Track, QueryType, Util } = require('discord-player');
const YouTube = require('youtube-sr').default;
const playdl   = require('play-dl');

class YouTubeExtractor extends BaseExtractor {
  static identifier = 'com.shadowbot.youtube';

  async activate() {
    this.protocols = ['ytsearch', 'youtube'];
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
    // URL directa de video
    if (context.type === QueryType.YOUTUBE_VIDEO || context.type === QueryType.YOUTUBE) {
      const video = await YouTube.getVideo(query).catch(() => null);
      if (!video) return this.createResponse();
      return this.createResponse(null, [this._buildTrack(video, context)]);
    }

    // Playlist
    if (context.type === QueryType.YOUTUBE_PLAYLIST) {
      const playlist = await YouTube.getPlaylist(query, { fetchAll: true }).catch(() => null);
      if (!playlist) return this.createResponse();
      const tracks = playlist.videos.map(v => this._buildTrack(v, context));
      return this.createResponse(null, tracks);
    }

    // Búsqueda de texto
    const results = await YouTube.search(query, { limit: 5, type: 'video' }).catch(() => []);
    if (!results.length) return this.createResponse();
    return this.createResponse(null, results.map(v => this._buildTrack(v, context)));
  }

  async stream(track) {
    const { stream } = await playdl.stream(track.url, { quality: 2 });
    return stream;
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
