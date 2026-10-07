const { EmbedBuilder } = require('discord.js');
const { seedRandom, dailySeed } = require('../utils/random');

module.exports = {
  names: ['rata'],
  async execute(message) {
    const target = message.mentions.users.first() || message.author;
    const pct = Math.floor(seedRandom(dailySeed(target.id)) * 101);
    const barra = '🐀'.repeat(Math.floor(pct / 10)) + '⬛'.repeat(10 - Math.floor(pct / 10));
    const comentario =
      pct >= 90 ? '🐀 Rata suprema del Santuario.' :
      pct >= 70 ? '🐭 Bastante rata.' :
      pct >= 40 ? '😅 Un poco rata.' :
      pct >= 20 ? '😌 Bastante generoso/a.' : '🤑 ¡Caritativo/a total!';
    const embed = new EmbedBuilder()
      .setColor('#8B4513')
      .setTitle('🐀 Rata-metro')
      .setDescription(`**${target.username}** es **${pct}% rata** hoy\n\n${barra}\n\n${comentario}`)
      .setFooter({ text: 'Se actualiza cada día' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
