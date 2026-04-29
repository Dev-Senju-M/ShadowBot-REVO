const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Muestra la canción actual'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue || !queue.isPlaying()) return interaction.reply({ content: '❌ No hay música reproduciéndose.', ephemeral: true });

    const track = queue.currentTrack;
    const progress = queue.node.createProgressBar();

    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎵 Reproduciendo ahora')
      .setDescription(`**[${track.title}](${track.url})**`)
      .setThumbnail(track.thumbnail)
      .addFields(
        { name: '👤 Artista', value: track.author, inline: true },
        { name: '⏱️ Duración', value: track.duration, inline: true },
        { name: '📥 Pedido por', value: `${track.requestedBy}`, inline: true },
        { name: '📊 Progreso', value: progress, inline: false },
      )
      .setFooter({ text: 'Santuario Mocho 🌑' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};