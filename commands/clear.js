const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder , MessageFlags} = require('discord.js');
const { sendModLog } = require('../modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Elimina mensajes del canal')
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Número de mensajes (1-100)').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const cantidad = interaction.options.getInteger('cantidad');
    if (cantidad < 1 || cantidad > 100) return interaction.reply({ content: '❌ Pon un número entre 1 y 100.', flags: MessageFlags.Ephemeral });
    const eliminados = await interaction.channel.bulkDelete(cantidad, true);
    await interaction.reply({ content: `🗑️ ${eliminados.size} mensajes eliminados.`, flags: MessageFlags.Ephemeral });

    await sendModLog(interaction.guild, new EmbedBuilder()
      .setColor('#95A5A6')
      .setTitle('🗑️ Clear')
      .addFields(
        { name: '🛡️ Moderador', value: `${interaction.user.tag}`, inline: true },
        { name: '📨 Canal', value: `<#${interaction.channel.id}>`, inline: true },
        { name: '🗑️ Mensajes eliminados', value: `${eliminados.size}`, inline: true },
      )
      .setTimestamp());
  }
};