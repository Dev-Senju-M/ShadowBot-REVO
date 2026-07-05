const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle , MessageFlags} = require('discord.js');
const { QueueRepeatMode } = require('discord-player');

module.exports = (client, player) => {
  player.events.on('playerStart', (queue, track) => {
    // No anunciar "Started playing" durante las rondas de /adivina (revelaría el título)
    if (queue.metadata?.isGameRound) return;

    const embed = new EmbedBuilder()
        .setColor('#1DB954')
        .setDescription(`**[${track.title}](${track.url})** by ${track.author}`)
        .setAuthor({ name: 'Started playing', iconURL: 'https://i.imgur.com/vTgEVsb.png' })
        .setThumbnail(track.thumbnail || null);

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
    console.error('[música:error]', error);
    queue.metadata.channel.send(`❌ Error: ${error.message}`);
  });

  player.events.on('playerError', (queue, error) => {
    console.error('[música:playerError]', error);
    queue.metadata.channel.send(`❌ Error al reproducir: ${error.message}`);
  });

  player.events.on('playerSkip', (queue, track) => {
    console.warn('[música:playerSkip] Canción saltada por error:', track.title);
    queue.metadata.channel.send(`⚠️ No se pudo reproducir **${track.title}** — se saltó.`);
  });

  // Botones del panel
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    if (!interaction.customId.startsWith('music_')) return;

    const queue = player.nodes.get(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música reproduciéndose.', flags: MessageFlags.Ephemeral });

    // Evita que los botones de música interfieran con una ronda del juego en curso
    if (queue.metadata?.isGameRound) {
      return interaction.reply({ content: '❌ Hay una partida de /adivina en curso, espera a que termine.', flags: MessageFlags.Ephemeral });
    }

    switch (interaction.customId) {
      case 'music_pause':
        if (queue.node.isPaused()) {
          queue.node.resume();
          await interaction.reply({ content: '▶️ Música reanudada.', flags: MessageFlags.Ephemeral });
        } else {
          queue.node.pause();
          await interaction.reply({ content: '⏸️ Música pausada.', flags: MessageFlags.Ephemeral });
        }
        break;
      case 'music_skip':
        queue.node.skip();
        await interaction.reply({ content: '⏭️ Canción saltada.', flags: MessageFlags.Ephemeral });
        break;
      case 'music_stop':
        queue.delete();
        await interaction.reply({ content: '⏹️ Música detenida.', flags: MessageFlags.Ephemeral });
        break;
      case 'music_loop': {
        // Ciclo: OFF(0) → TRACK(1) → QUEUE(2) → OFF(0)
        const nextMode = (queue.repeatMode + 1) % 3;
        queue.setRepeatMode(nextMode);
        const loopLabels = {
          [QueueRepeatMode.OFF]: '➡️ Loop desactivado.',
          [QueueRepeatMode.TRACK]: '🔁 Loop de canción activado.',
          [QueueRepeatMode.QUEUE]: '🔂 Loop de cola activado.',
        };
        await interaction.reply({ content: loopLabels[nextMode], flags: MessageFlags.Ephemeral });
        break;
      }
      case 'music_prev':
        if (!queue.history.tracks.size) {
          return interaction.reply({ content: '❌ No hay canciones anteriores.', flags: MessageFlags.Ephemeral });
        }
        await queue.history.previous();
        await interaction.reply({ content: '⏮️ Canción anterior.', flags: MessageFlags.Ephemeral });
        break;
    }
  });
};