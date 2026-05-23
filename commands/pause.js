const { SlashCommandBuilder , MessageFlags} = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pausa o reanuda la música'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música reproduciéndose.', flags: MessageFlags.Ephemeral });

    if (queue.node.isPaused()) {
      queue.node.resume();
      await interaction.reply('▶️ Música reanudada.');
    } else {
      queue.node.pause();
      await interaction.reply('⏸️ Música pausada.');
    }
  }
};