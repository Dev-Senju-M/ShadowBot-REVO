const { SlashCommandBuilder } = require('discord.js');
const { useQueue, QueueRepeatMode } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Activa o desactiva el loop')
    .addStringOption(opt =>
      opt.setName('modo')
        .setDescription('Modo de repetición')
        .setRequired(true)
        .addChoices(
          { name: '🔁 Canción', value: 'track' },
          { name: '🔂 Cola', value: 'queue' },
          { name: '➡️ Desactivar', value: 'off' },
        )),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música reproduciéndose.', ephemeral: true });

    const modo = interaction.options.getString('modo');
    const modos = { track: QueueRepeatMode.TRACK, queue: QueueRepeatMode.QUEUE, off: QueueRepeatMode.OFF };

    queue.setRepeatMode(modos[modo]);
    const textos = { track: '🔁 Loop de canción activado.', queue: '🔂 Loop de cola activado.', off: '➡️ Loop desactivado.' };
    await interaction.reply(textos[modo]);
  }
};