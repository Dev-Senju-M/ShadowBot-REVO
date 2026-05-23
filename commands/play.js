const { SlashCommandBuilder , MessageFlags} = require('discord.js');
const { useMainPlayer } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Reproduce una canción o playlist de Spotify')
    .addStringOption(opt =>
      opt.setName('cancion')
        .setDescription('Nombre de canción o link de Spotify')
        .setRequired(true)),

  async execute(interaction) {
    const player = useMainPlayer();
    const canal = interaction.member.voice.channel;

    if (!canal) return interaction.reply({ content: '❌ Debes estar en un canal de voz.', flags: MessageFlags.Ephemeral });

    await interaction.deferReply();

    const query = interaction.options.getString('cancion');

    try {
      const { track } = await player.play(canal, query, {
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

      await interaction.followUp(`🎵 Agregado a la cola: **${track.title}** — ${track.author}`);
    } catch (err) {
      console.error(err);
      await interaction.followUp(`❌ No pude reproducir eso. Asegúrate de usar un link de Spotify o el nombre de una canción.\n\`${err.message}\``);
    }
  }
};