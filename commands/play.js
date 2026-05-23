const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción, playlist o álbum de Spotify / YouTube')
    .addStringOption(opt =>
      opt.setName('cancion')
        .setDescription('Nombre, link de Spotify o link de YouTube')
        .setRequired(true)),

  async execute(interaction) {
    const player = useMainPlayer();
    const canal = interaction.member.voice.channel;

    if (!canal) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', flags: MessageFlags.Ephemeral });

    await interaction.deferReply();

    const query = interaction.options.getString('cancion');

    try {
      const { track, queue } = await player.play(canal, query, {
        nodeOptions: {
          metadata: { channel: interaction.channel },
          selfDeaf: true,
          volume: 80,
          leaveOnEmpty: true,
          leaveOnEmptyCooldown: 5000,
          leaveOnEnd: true,
          leaveOnEndCooldown: 10000,
        },
        requestedBy: interaction.user,
      });

      // Playlist agregada
      if (track.playlist) {
        const playlist  = track.playlist;
        const count     = queue.tracks.size;
        const thumbnail = playlist.thumbnail || track.thumbnail || null;

        const embed = new EmbedBuilder()
          .setColor('#1DB954')
          .setTitle('Added Playlist')
          .setThumbnail(thumbnail)
          .addFields(
            { name: 'Playlist',         value: playlist.title || 'Desconocida', inline: true },
            { name: 'Tracks',           value: String(count),                   inline: true },
          )
          .setFooter({ text: 'Santuario Mocho 🌑' });

        return interaction.followUp({ embeds: [embed] });
      }

      // Track individual
      await interaction.followUp(`🎵 Agregado a la cola: **${track.title}** — ${track.author}`);
    } catch (err) {
      console.error(err);
      await interaction.followUp(`❌ No pude reproducir eso.\n\`${err.message}\``);
    }
  }
};
