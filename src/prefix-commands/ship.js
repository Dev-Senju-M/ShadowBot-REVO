const { EmbedBuilder } = require('discord.js');
const { seedRandom } = require('../utils/random');

module.exports = {
  names: ['ship'],
  async execute(message) {
    const menciones = [...message.mentions.users.values()];
    let user1, user2;
    if (menciones.length >= 2) { [user1, user2] = menciones; }
    else if (menciones.length === 1) { user1 = message.author; user2 = menciones[0]; }
    else { return message.reply('❌ Menciona dos usuarios. Ej: `!ship @u1 @u2`'); }

    // Ordenar IDs para que el resultado sea igual sin importar el orden
    const [idA, idB] = [user1.id, user2.id].sort();
    const pct = Math.floor(seedRandom(parseInt(idA.slice(-5)) + parseInt(idB.slice(-5))) * 101);
    const barra = '❤️'.repeat(Math.floor(pct / 10)) + '🖤'.repeat(10 - Math.floor(pct / 10));
    const comentario =
      pct >= 90 ? '💍 ¡Almas gemelas!' :
      pct >= 70 ? '💕 ¡Buena compatibilidad!' :
      pct >= 40 ? '💬 Hay algo ahí...' :
      pct >= 20 ? '😬 No mucho en común.' : '💀 Terrible match.';
    const color = pct >= 70 ? '#ED4245' : pct >= 40 ? '#E67E22' : '#95A5A6';
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle('💘 Ship')
      .setDescription(`**${user1.username}** 💞 **${user2.username}**\n\n${barra}\n\n**${pct}%** — ${comentario}`)
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
