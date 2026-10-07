const { EmbedBuilder } = require('discord.js');

module.exports = {
  names: ['dado', 'dice'],
  async execute(message, args) {
    const caras = Math.min(Math.max(parseInt(args[0]) || 6, 2), 100);
    const resultado = Math.floor(Math.random() * caras) + 1;
    const embed = new EmbedBuilder()
      .setColor('#E67E22')
      .setTitle('🎲 Dado')
      .setDescription(`Tiraste un dado de **${caras}** caras\n\n# ${resultado}`)
      .setFooter({ text: `Tirado por ${message.author.tag}` })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
