require('dotenv').config();
const { Client, GatewayIntentBits, Collection , MessageFlags} = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const { YoutubeExtractor } = require('discord-player-youtube');
const fs = require('fs');
const http = require('http');

if (process.env.YOUTUBE_COOKIE) {
  console.log('[cookies] ✅ YOUTUBE_COOKIE detectada, se usará para autenticar con YouTube');
} else {
  console.log('[cookies] ⚠️ YOUTUBE_COOKIE no definida, el extractor intentará funcionar sin sesión (menos estable)');
}

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

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err?.message ?? err);
});

(async () => {
  console.log('[startup] Cargando extractores...');

  // Extractor de YouTube (discord-player-youtube, basado en youtubei.js).
  // Usa la cookie de una cuenta dedicada para autenticar y evitar bloqueos
  // de "Sign in to confirm you're not a bot" que sufre yt-dlp en servidores.
  await player.extractors.register(YoutubeExtractor, {
    cookie: process.env.YOUTUBE_COOKIE,
    filterAutoplayTracks: true,
    disableYTJSLog: true,
  });

  // Spotify, SoundCloud, etc. Los links de Spotify se resuelven buscando la
  // misma canción en YouTube automáticamente (bridging nativo de discord-player,
  // ya no hace falta un createStream manual con yt-dlp).
  await player.extractors.loadMulti(DefaultExtractors, {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    },
  });

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
require('./events/activity-logs')(client);

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