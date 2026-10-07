const { EmbedBuilder } = require('discord.js');
const { getEcon, saveEcon, getUser } = require('../utils/economia');

module.exports = {
  names: ['apostar', 'bet'],
  async execute(message, args) {
    const db = getEcon();
    const user = getUser(db, message.author.id);
    const cantidad = parseInt(args[0]);

    if (!cantidad || cantidad <= 0) return message.reply('❌ Ej: `!apostar 50`');
    if (cantidad > user.monedas) return message.reply(`❌ No tienes suficientes monedas. Balance: **${user.monedas} 🪙**`);

    const gana = Math.random() < 0.5;
    user.monedas += gana ? cantidad : -cantidad;
    saveEcon(db);

    const embed = new EmbedBuilder()
      .setColor(gana ? '#57F287' : '#ED4245')
      .setTitle(gana ? '🎉 ¡Ganaste!' : '💀 Perdiste')
      .setDescription(`${gana ? `+${cantidad}` : `-${cantidad}`} 🪙\n\nBalance: **${user.monedas} 🪙**`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
