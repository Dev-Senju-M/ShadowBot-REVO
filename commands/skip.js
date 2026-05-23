const { SlashCommandBuilder , MessageFlags} = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Salta la canción actual'),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música reproduciéndose.', flags: MessageFlags.Ephemeral });
    queue.node.skip();
    await interaction.reply('⏭️ Canción saltada.');
  }
};