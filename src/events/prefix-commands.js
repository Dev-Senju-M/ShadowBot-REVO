// Despacha los comandos con prefijo "!" a los archivos de prefix-commands/.
// Cada archivo exporta { names: ['nombre', 'alias'], execute(message, args) }.
const fs = require('fs');
const path = require('path');

const PREFIX = '!';
const DIR = path.join(__dirname, '..', 'prefix-commands');

const comandos = new Map(); // nombre o alias -> comando
for (const file of fs.readdirSync(DIR).filter(f => f.endsWith('.js'))) {
  const command = require(path.join(DIR, file));
  for (const name of command.names) comandos.set(name, command);
}

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = comandos.get(args.shift().toLowerCase());
    if (!command) return;

    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(`[prefix-commands] Error en !${command.names[0]}:`, error);
      await message.reply('❌ Hubo un error.').catch(() => {});
    }
  });
};
