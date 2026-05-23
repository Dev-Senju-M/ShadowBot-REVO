require('dotenv').config();
const { Client, GatewayIntentBits, Collection , MessageFlags} = require('discord.js');
const { Player } = require('discord-player');
const { DefaultExtractors } = require('@discord-player/extractor');
const playdl = require('play-dl');
const YouTubeExtractor = require('./utils/youtube-extractor');
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

(async () => {
  await player.extractors.loadMulti(DefaultExtractors, {
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
      // Spotify no provee audio directo; _ext._lib = spotify-url-info (ya inicializado)
      createStream: async (_ext, url) => {
        const data = await _ext._lib.getData(url).catch(() => null);
        if (!data) throw new Error(`No se pudo resolver datos de Spotify: ${url}`);

        const artist = data.artists?.[0]?.name ?? data.artist ?? '';
        const title  = data.title ?? data.name ?? '';
        const query  = [artist, title].filter(Boolean).join(' - ');
        if (!query) throw new Error(`Sin metadatos para: ${url}`);

        const results = await playdl.search(query, { source: { youtube: 'video' }, limit: 1 });
        if (!results.length) throw new Error(`Sin resultados en YouTube: "${query}"`);

        console.log(`[música] Spotify→YT: "${query}" → ${results[0].title}`);
        const { stream } = await playdl.stream(results[0].url, { quality: 2 });
        return stream;
      },
    }
  });
  await player.extractors.register(YouTubeExtractor, {});
  console.log('✅ Extractores cargados con Spotify → YouTube bridge + YouTube extractor');
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
    console.error(error);
    const payload = { content: '❌ Hubo un error.', flags: MessageFlags.Ephemeral };
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(payload).catch(console.error);
    } else {
      await interaction.reply(payload).catch(console.error);
    }
  }
});

client.login(process.env.TOKEN);