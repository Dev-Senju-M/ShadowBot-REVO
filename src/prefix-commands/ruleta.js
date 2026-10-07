const { EmbedBuilder } = require('discord.js');

const opciones = [
  { emoji: '🌟', texto: '¡GRAN PREMIO! Las sombras te bendicen hoy.', color: '#F1C40F', peso: 5 },
  { emoji: '✨', texto: 'Buena suerte. El Santuario sonríe.', color: '#57F287', peso: 20 },
  { emoji: '😐', texto: 'Nada especial. La ruleta te ignora.', color: '#95A5A6', peso: 40 },
  { emoji: '💀', texto: 'Mala suerte. Las sombras te dan la espalda.', color: '#E67E22', peso: 25 },
  { emoji: '🌑', texto: '¡CATÁSTROFE! El Santuario te condena.', color: '#ED4245', peso: 10 },
];

module.exports = {
  names: ['ruleta'],
  async execute(message) {
    const total = opciones.reduce((s, o) => s + o.peso, 0);
    let rand = Math.random() * total;
    let resultado = opciones[opciones.length - 1];
    for (const op of opciones) { rand -= op.peso; if (rand <= 0) { resultado = op; break; } }
    const embed = new EmbedBuilder()
      .setColor(resultado.color)
      .setTitle(`${resultado.emoji} Ruleta`)
      .setDescription(`*La ruleta gira...*\n\n**${resultado.texto}**`)
      .setFooter({ text: `Jugada por ${message.author.tag}` })
      .setTimestamp();
    return message.reply({ embeds: [embed] });
  },
};
