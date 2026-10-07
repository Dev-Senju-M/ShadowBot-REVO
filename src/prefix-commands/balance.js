const { EmbedBuilder } = require('discord.js');
const { getEcon, getUser } = require('../utils/economia');

module.exports = {
  names: ['balance', 'bal'],
  async execute(message) {
    const target = message.mentions.users.first() || message.author;
    const db = getEcon();
    const user = getUser(db, target.id);
    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('💰 Balance')
      .setDescription(`**${target.username}** tiene **${user.monedas} 🪙 monedas**`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
