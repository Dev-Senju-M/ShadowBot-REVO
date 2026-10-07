const { EmbedBuilder } = require('discord.js');

const respuestas = [
  '🟢 Definitivamente sí.', '🟢 Sin duda alguna.', '🟢 Puedes contar con ello.',
  '🟢 Las señales apuntan a sí.', '🟢 Todo indica que sí.',
  '🟡 Pregunta de nuevo más tarde.', '🟡 No puedo predecirlo ahora.',
  '🟡 Mejor no te digo.', '🟡 Las sombras no responden.',
  '🔴 No cuentes con ello.', '🔴 Mi respuesta es no.', '🔴 Las perspectivas son malas.',
  '🔴 Muy dudoso.', '🔴 Definitivamente no.',
];

module.exports = {
  names: ['8ball'],
  async execute(message, args) {
    if (!args.length) return message.reply('❓ Escribe una pregunta. Ej: `!8ball ¿Aprobaré?`');
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎱 Magic 8Ball')
      .addFields(
        { name: '❓ Pregunta', value: args.join(' ') },
        { name: '🎱 Respuesta', value: respuestas[Math.floor(Math.random() * respuestas.length)] },
      )
      .setFooter({ text: `Preguntado por ${message.author.tag}` })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
