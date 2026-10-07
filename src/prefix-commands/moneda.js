const { EmbedBuilder } = require('discord.js');

module.exports = {
  names: ['moneda', 'coin'],
  async execute(message) {
    const cara = Math.random() < 0.5;
    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('🪙 Moneda')
      .setDescription(`# ${cara ? '🟡 CARA' : '⚪ CRUZ'}`)
      .setFooter({ text: `Lanzada por ${message.author.tag}` })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
