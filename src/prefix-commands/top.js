const { EmbedBuilder } = require('discord.js');
const { getEcon } = require('../utils/economia');

module.exports = {
  names: ['top'],
  async execute(message) {
    const db = getEcon();
    const sorted = Object.entries(db.usuarios)
      .sort((a, b) => b[1].monedas - a[1].monedas)
      .slice(0, 10);

    if (!sorted.length) return message.reply('❌ Nadie tiene monedas aún. Usa `!daily`.');

    const medals = ['🥇', '🥈', '🥉'];
    const lista = sorted.map(([id, data], i) =>
      `${medals[i] || `\`${i + 1}.\``} <@${id}> — **${data.monedas} 🪙**`
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('🏆 Top Monedas')
      .setDescription(lista)
      .setFooter({ text: 'Santuario Mocho 🌑' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
