const { EmbedBuilder } = require('discord.js');
const { getEcon, saveEcon, getUser } = require('../utils/economia');

const DAILY_MS = 24 * 60 * 60 * 1000;

module.exports = {
  names: ['daily'],
  async execute(message) {
    const db = getEcon();
    const user = getUser(db, message.author.id);
    const ahora = Date.now();

    if (user.ultimo_daily && ahora - user.ultimo_daily < DAILY_MS) {
      const falta = DAILY_MS - (ahora - user.ultimo_daily);
      const h = Math.floor(falta / 3600000);
      const m = Math.floor((falta % 3600000) / 60000);
      return message.reply(`⏰ Ya reclamaste tu daily. Vuelve en **${h}h ${m}m**.`);
    }

    const ganadas = Math.floor(Math.random() * 401) + 100; // 100–500
    user.monedas += ganadas;
    user.ultimo_daily = ahora;
    saveEcon(db);

    const embed = new EmbedBuilder()
      .setColor('#F1C40F')
      .setTitle('🪙 Daily reclamado')
      .setDescription(`Recibiste **+${ganadas} 🪙**\n\nBalance: **${user.monedas} 🪙**`)
      .setFooter({ text: 'Vuelve en 24 horas' })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
