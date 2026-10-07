const { EmbedBuilder } = require('discord.js');

module.exports = {
  names: ['comandos', 'help'],
  async execute(message) {
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('📋 Comandos con !')
      .addFields(
        { name: '🎲 Juegos de texto', value: '`!8ball` `!dado` `!moneda` `!ruleta`' },
        { name: '😄 Juegos sociales', value: '`!ship @u1 @u2` `!rata [@u]` `!iq [@u]`' },
        { name: '🪙 Economía', value: '`!daily` `!balance [@u]` `!apostar <cant>` `!top`' },
        { name: '🧩 Trivia', value: '`!trivia` — Responde A/B/C/D · +50🪙 si aciertas' },
      )
      .setFooter({ text: 'Santuario Mocho 🌑' });
    return message.reply({ embeds: [embed] });
  },
};
