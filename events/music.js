const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = (client, player) => {
  player.events.on('playerStart', (queue, track) => {
    const embed = new EmbedBuilder()
      .setColor('#9B59B6')
      .setTitle('🎵 Ahora reproduciendo')
      .setDescription(`**[${track.title}](${track.url})**`)
      .setThumbnail(track.thumbnail)
      .addFields(
        { name: '👤 Artista', value: track.author, inline: true },
        { name: '⏱️ Duración', value: track.duration, inline: true },
        { name: '📥 Pedido por', value: `${track.requestedBy}`, inline: true },
      )
      .setFooter({ text: 'Santuario Mocho 🌑' })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('music_prev').setEmoji('⏮️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_pause').setEmoji('⏸️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('music_skip').setEmoji('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('music_stop').setEmoji('⏹️').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('music_loop').setEmoji('🔁').setStyle(ButtonStyle.Success),
    );

    queue.metadata.channel.send({ embeds: [embed], components: [row] });
  });

  player.events.on('emptyQueue', (queue) => {
    queue.metadata.channel.send('✅ Cola vacía. *El Santuario vuelve al silencio...* 🌑');
  });

  player.events.on('error', (queue, error) => {
    console.error(error);
    queue.metadata.channel.send(`❌ Error: ${error.message}`);
  });

  // Botones del panel
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('music_')) return;

    const queue = player.nodes.get(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música reproduciéndose.', ephemeral: true });

    switch (interaction.customId) {
      case 'music_pause':
        if (queue.node.isPaused()) {
          queue.node.resume();
          await interaction.reply({ content: '▶️ Música reanudada.', ephemeral: true });
        } else {
          queue.node.pause();
          await interaction.reply({ content: '⏸️ Música pausada.', ephemeral: true });
        }
        break;
      case 'music_skip':
        queue.node.skip();
        await interaction.reply({ content: '⏭️ Canción saltada.', ephemeral: true });
        break;
      case 'music_stop':
        queue.delete();
        await interaction.reply({ content: '⏹️ Música detenida.', ephemeral: true });
        break;
      case 'music_loop': {
        const mode = queue.repeatMode === 0 ? 1 : 0;
        queue.setRepeatMode(mode);
        await interaction.reply({ content: mode === 1 ? '🔁 Loop activado.' : '➡️ Loop desactivado.', ephemeral: true });
        break;
      }
      case 'music_prev':
        if (!queue.history.tracks.size) {
          return interaction.reply({ content: '❌ No hay canciones anteriores.', ephemeral: true });
        }
        await queue.history.previous();
        await interaction.reply({ content: '⏮️ Canción anterior.', ephemeral: true });
        break;
    }
  });
};