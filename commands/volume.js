const { SlashCommandBuilder , MessageFlags} = require('discord.js');
const { useQueue } = require('discord-player');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Ajusta el volumen')
    .addIntegerOption(opt =>
      opt.setName('nivel').setDescription('Volumen del 1 al 100').setRequired(true)),

  async execute(interaction) {
    const queue = useQueue(interaction.guild.id);
    if (!queue) return interaction.reply({ content: '❌ No hay música reproduciéndose.', flags: MessageFlags.Ephemeral });

    const nivel = interaction.options.getInteger('nivel');
    if (nivel < 1 || nivel > 100) return interaction.reply({ content: '❌ El volumen debe estar entre 1 y 100.', flags: MessageFlags.Ephemeral });

    queue.node.setVolume(nivel);
    await interaction.reply(`🔊 Volumen ajustado a **${nivel}%**`);
  }
};