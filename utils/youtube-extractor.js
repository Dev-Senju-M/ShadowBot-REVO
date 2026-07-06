const path = require('path');
const fs   = require('fs');
const { BaseExtractor, Track, QueryType } = require('discord-player');
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

  // Ejecuta yt-dlp con --dump-json (agregando el proxy si está configurado) y
  // devuelve un array de objetos parseados. Todo el metadata pasa por aquí,
  // por el mismo camino (y el mismo proxy) que el audio.
  async _ytdlpJson(args) {
    const argsFinal = [...args];
    if (process.env.WARP_PROXY_URL) {
      argsFinal.push('--proxy', process.env.WARP_PROXY_URL);
    }
    const output = await this._ytdlp.execPromise(argsFinal);
    return output
        .trim()
        .split('\n')
        .filter(Boolean)
        .map(line => {
          try { return JSON.parse(line); } catch { return null; }
        })
        .filter(Boolean);
  }

  async handle(query, context) {
    try {
      if (context.type === QueryType.YOUTUBE_VIDEO || context.type === QueryType.YOUTUBE) {
        const datos = await this._ytdlpJson([
          query, '--dump-json', '--no-playlist', '--skip-download', '--no-warnings',
        ]);
        if (!datos.length) return this.createResponse();
        return this.createResponse(null, [this._buildTrack(datos[0], context)]);
      }

      if (context.type === QueryType.YOUTUBE_PLAYLIST) {
        const datos = await this._ytdlpJson([
          query, '--dump-json', '--flat-playlist', '--no-warnings',
        ]);
        if (!datos.length) return this.createResponse();
        return this.createResponse(null, datos.map(v => this._buildTrack(v, context)));
      }

      // Búsqueda por texto
      const datos = await this._ytdlpJson([
        `ytsearch1:${query}`, '--dump-json', '--no-warnings', '--skip-download',
      ]);
      if (!datos.length) return this.createResponse();
      return this.createResponse(null, datos.map(v => this._buildTrack(v, context)));
    } catch (e) {
      console.error('[youtube:handle]', e.message);
      return this.createResponse();
    }
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

  _buildTrack(v, context) {
    const segundos = Math.round(v.duration ?? 0);
    const mm = Math.floor(segundos / 60);
    const ss = String(segundos % 60).padStart(2, '0');
    const miniaturas = Array.isArray(v.thumbnails) ? v.thumbnails : [];

    const track = new Track(this.context.player, {
      title:       v.title ?? 'Desconocido',
      author:      v.uploader ?? v.channel ?? 'Desconocido',
      url:         v.webpage_url ?? (v.id ? `https://www.youtube.com/watch?v=${v.id}` : ''),
      thumbnail:   v.thumbnail ?? miniaturas.at(-1)?.url ?? '',
      duration:    segundos ? `${mm}:${ss}` : '0:00',
      views:       v.view_count ?? 0,
      requestedBy: context.requestedBy,
      source:      'youtube',
      queryType:   context.type,
    });
    track.extractor = this;
    return track;
  }
}

module.exports = YouTubeExtractor;