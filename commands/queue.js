const { SlashCommandBuilder, EmbedBuilder , MessageFlags} = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Muestra la cola de canciones'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) return interaction.reply({ content: '❌ No hay música reproduciéndose.', flags: MessageFlags.Ephemeral });

    const tracks = queue.tracks.toArray().slice(0, 10);
    const lista = tracks.length
      ? tracks.map((t, i) => `\`${i + 1}.\` **${t.title}** — ${t.author}`).join('\n')
      : '*No hay más canciones en la cola.*';

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎵 Cola de canciones')
      .setDescription(`**Reproduciendo ahora:**\n🎶 ${queue.currentTrack.title}\n\n**Siguiente:**\n${lista}`)
      .setFooter({ text: `${queue.tracks.size} canciones en cola • Santuario Mocho 🌑` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};