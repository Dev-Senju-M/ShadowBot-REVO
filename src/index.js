const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client, GatewayIntentBits, Collection , MessageFlags} = require('discord.js');
const fs = require('fs');

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
});
process.on('unhandledRejection', (error) => {
  console.error('[unhandledRejection]', error);
});


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

const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.data.name, command);
}

// Escribe yt-cookies.txt antes de iniciar el módulo de música
require('./utils/write-cookies');

// Cada archivo de events/ exporta (client) => { ... } y se carga automáticamente
const eventFiles = fs.readdirSync(path.join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
  require(`./events/${file}`)(client);
}


client.once('clientReady', () => {
  console.log(`✅ ShadowBot listo como ${client.user.tag}`);
});

// Servidor web: /health para la landing y el panel (si está configurado)
require('./web/server').iniciarServidorWeb(client);

client.on('interactionCreate', async interaction => {
  if (interaction.isAutocomplete()) {
    const command = client.commands.get(interaction.commandName);
    if (!command || !command.autocomplete) return;
    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(error);
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction);
  } catch (error) {
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

const store = require('./utils/db');

// Guarda los datos pendientes antes de que Railway detenga el contenedor
for (const sig of ['SIGTERM', 'SIGINT']) {
  process.once(sig, async () => {
    await store.close();
    process.exit(0);
  });
}

store.init()
  .then(() => client.login(process.env.TOKEN))
  .catch((err) => {
    console.error('[db] No se pudo inicializar la base de datos:', err);
    process.exit(1);
  });