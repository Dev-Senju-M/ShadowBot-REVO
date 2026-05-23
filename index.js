require('dotenv').config();
const path = require('path');
const { Client, GatewayIntentBits, Collection , MessageFlags} = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const playdl = require('play-dl');
const YTDlpWrap = require('yt-dlp-wrap').default;
const YouTubeExtractor = require('./utils/youtube-extractor');

// Prefer local binary (installed via railway.json buildCommand), fall back to PATH
const LOCAL_YTDLP = path.join(process.cwd(), 'yt-dlp');
const ytdlpBin = require('fs').existsSync(LOCAL_YTDLP) ? LOCAL_YTDLP : undefined;
const ytdlp = new YTDlpWrap(ytdlpBin);
const fs = require('fs');
const http = require('http');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ]
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

const player = new Player(client);

// Diagnóstico: verificar yt-dlp al arranque
ytdlp.getVersion()
  .then(v => console.log(`[yt-dlp] ✅ v${v} disponible`))
  .catch(() => console.error('[yt-dlp] ❌ NO encontrado en PATH — audio no funcionará'));

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.message ?? err);
});

(async () => {
  console.log('[startup] Cargando extractores...');
  await player.extractors.loadMulti(DefaultExtractors, {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      createStream: async (_ext, url) => {
        try {
          const data = await _ext._lib.getData(url).catch(() => null);
          if (!data) throw new Error(`Sin datos Spotify para: ${url}`);

          const artist = data.artists?.[0]?.name ?? data.artist ?? '';
          const title  = data.title ?? data.name ?? '';
          const query  = [artist, title].filter(Boolean).join(' - ');
          if (!query) throw new Error(`Sin metadatos para: ${url}`);

          console.log(`[música] Buscando: "${query}"`);
          const output = await ytdlp.execPromise([
            `ytsearch1:${query}`,
            '-f', 'bestaudio[ext=webm]/bestaudio[ext=m4a]/bestaudio/best',
            '--get-url',
            '--no-playlist',
            '--no-warnings',
          ]);
          const streamUrl = output.trim().split('\n')[0];
          if (!streamUrl || !streamUrl.startsWith('http')) throw new Error('URL inválida de yt-dlp');
          console.log('[música:spotify] URL OK');
          return streamUrl;
        } catch (err) {
          console.error('[música:createStream]', err.message);
          throw err;
        }
      },
    }
  });
  await player.extractors.register(YouTubeExtractor, {});
  console.log('✅ Extractores cargados');
})();

require('./events/welcome')(client);
require('./events/verify')(client);
require('./events/music')(client, player);
require('./events/stats-channels')(client);
require('./events/autorespuesta')(client);
require('./events/twitch-live')(client);
require('./events/cumpleanos')(client);
require('./events/levels')(client);
require('./events/prefix-commands')(client);
require('./events/fortnite-shop')(client);

let botReady = false;

client.once('clientReady', () => {
  console.log(`✅ ShadowBot listo como ${client.user.tag}`);
  botReady = true;
});

// Health endpoint — permite que la web page consulte el estado del bot
const HEALTH_PORT = process.env.HEALTH_PORT || 3000;
http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Content-Type', 'application/json');

  if (req.url === '/health' && req.method === 'GET') {
    // BOT_STATUS puede ser 'online' o 'maintenance' (variable de entorno en Railway)
    const status = !botReady ? 'starting' : (process.env.BOT_STATUS || 'online');
    res.writeHead(200);
    res.end(JSON.stringify({
      status,
      uptime: Math.floor(process.uptime()),
      tag: client.user?.tag ?? null,
    }));
  } else {
    res.writeHead(404);
    res.end('{}');
  }
}).listen(HEALTH_PORT, () => {
  console.log(`🌐 Health endpoint activo en puerto ${HEALTH_PORT}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
    // 10062 = interaction expirada (bot se reinició o tardó > 3s) — ignorar silenciosamente
    if (error.code === 10062) return;
    console.error(error);
    const payload = { content: '❌ Hubo un error.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

client.login(process.env.TOKEN);