const { EmbedBuilder } = require('discord.js');
const { seedRandom, dailySeed } = require('../utils/random');

module.exports = {
  names: ['iq'],
  async execute(message) {
    const target = message.mentions.users.first() || message.author;
    const iq = Math.floor(seedRandom(dailySeed(target.id) + 99) * 201); // 0-200
    const comentario =
      iq >= 160 ? '🧠 Genio absoluto.' :
      iq >= 130 ? '📚 Muy inteligente.' :
      iq >= 90  ? '😐 Promedio.' :
      iq >= 60  ? '🤔 Por debajo del promedio.' : '🪨 Roca.';
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🧠 IQ Test')
      .setDescription(`El IQ de **${target.username}** hoy es:\n\n# ${iq}\n\n${comentario}`)
      .setFooter({ text: 'Se actualiza cada día' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
