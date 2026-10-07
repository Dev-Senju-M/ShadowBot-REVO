const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { REST, Routes } = require('discord.js');
const fs = require('fs');

// Uso:
//   npm run deploy                → registra los comandos
//                                   (en GUILD_ID si está definido: al instante; si no, globales: hasta ~1h)
//   npm run deploy:clear-global   → borra los comandos globales (evita duplicados al probar con GUILD_ID)
const clearGlobal = process.argv.includes('--clear-global');
const { TOKEN, CLIENT_ID, GUILD_ID } = process.env;

const faltan = ['TOKEN', 'CLIENT_ID'].filter(k => !process.env[k]);
if (faltan.length) {
  console.error(`❌ Faltan ${faltan.join(', ')} en el .env`);
  process.exit(1);
}

const commands = [];
if (!clearGlobal) {
  const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    commands.push(command.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  if (clearGlobal) {
    console.log('Borrando comandos globales...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: [] });
    console.log('✅ Comandos globales borrados');
    return;
  }

  if (GUILD_ID) {
    console.log(`Registrando ${commands.length} comandos en el servidor ${GUILD_ID}...`);
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  } else {
    console.log(`Registrando ${commands.length} comandos globales...`);
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
  }
  console.log('✅ Comandos registrados!');
})().catch((err) => {
  console.error('❌ No se pudieron registrar los comandos:', err.message);
  process.exit(1);
});
