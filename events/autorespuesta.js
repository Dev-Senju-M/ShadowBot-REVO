const fs = require('fs');
const path = require('path');

const archivoPath = path.join(__dirname, '../autorespuestas.json');

module.exports = (client) => {
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const data = JSON.parse(fs.readFileSync(archivoPath, 'utf8'));

    // Verificar si mencionaron al bot
    if (message.mentions.has(client.user)) {
      const respuestasMention = [
        `👀 ¿Me llamaste, ${message.author.username}?`,
        `🌑 Aquí estoy, ${message.author.username}. ¿Qué necesitas?`,
        `😶‍🌫️ Sí, soy yo. ¿En qué te ayudo, ${message.author.username}?`,
        `🦇 El Santuario escucha, ${message.author.username}...`,
        `✨ Presente, ${message.author.username}. ¿Qué se te ofrece?`,
      ];
      const random = respuestasMention[Math.floor(Math.random() * respuestasMention.length)];
      return message.reply(random);
    }

    // Auto-respuestas normales
    for (const [trigger, respuesta] of Object.entries(data)) {
      if (message.content.includes(trigger)) {
        await message.reply(respuesta);
        break;
      }
    }
  });
};