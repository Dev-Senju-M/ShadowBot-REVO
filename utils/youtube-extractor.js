const path = require('path');
const fs   = require('fs');
const { BaseExtractor, Track, QueryType } = require('discord-player');
const YTDlpWrap = require('yt-dlp-wrap').default;

const LOCAL_YTDLP = path.join(process.cwd(), 'yt-dlp');
const ytdlpBin = fs.existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : undefined;
const COOKIES_PATH = path.join(process.cwd(), 'cookies.txt');

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

  // Agrega proxy y/o cookies a un set de argumentos de yt-dlp, si están configurados
  _extras() {
    const extras = [];
    if (process.env.WARP_PROXY_URL) extras.push('--proxy', process.env.WARP_PROXY_URL);
    if (fs.existsSync(COOKIES_PATH)) extras.push('--cookies', COOKIES_PATH);
    return extras;
  }

  async _ytdlpJson(args) {
    const output = await this._ytdlp.execPromise([...args, ...this._extras()]);
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

  // CLAVE: en vez de pedirle a yt-dlp solo la URL (--get-url) y dejar que discord-player
  // la descargue por su cuenta (sin proxy ni cookies), hacemos que yt-dlp DESCARGUE el
  // audio real y lo mande por stdout — así el proxy/cookies protegen la descarga completa,
  // no solo la consulta de metadata.
  async stream(track) {
    console.log(`[youtube:stream] ${track.title}`);
    // NOTA: no pasar '-o'/'-' acá — execStream() de yt-dlp-wrap ya lo agrega
    // internamente. Pasarlo dos veces puede confundir a yt-dlp.
    const args = [
      track.url,
      '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
      '--no-playlist',
      '--no-warnings',
      ...this._extras(),
    ];

    const flujo = this._ytdlp.execStream(args);

    // Log completo de stderr de yt-dlp para poder diagnosticar (bot-check,
    // cookies vencidas, geobloqueo, etc). Sin '--quiet' esto ahora se ve.
    flujo.on('ytDlpEvent', (eventType, eventData) => {
      console.log(`[youtube:stream:ytdlp] ${eventType} ${eventData}`);
    });
    flujo.on('error', err => console.error('[youtube:stream:error]', err.message));

    console.log('[youtube:stream] descargando vía yt-dlp' +
        (process.env.WARP_PROXY_URL ? ' + proxy' : '') +
        (fs.existsSync(COOKIES_PATH) ? ' + cookies' : ''));

    return flujo;
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