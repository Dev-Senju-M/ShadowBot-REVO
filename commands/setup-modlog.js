const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder , MessageFlags} = require('discord.js');
const store = require('../utils/db');


module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-modlog')
    .setDescription('Configura el canal de logs de moderación (Admin only)')
    .addChannelOption(opt =>
      opt.setName('canal').setDescription('Canal donde se registrarán las acciones de moderación').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const canal = interaction.options.getChannel('canal');
    const config = store.get('config');
    config.modLogChannel = canal.id;
    store.set('config', config);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('✅ Canal de Logs Configurado')
          .setDescription(`Los logs de moderación se enviarán a <#${canal.id}>`)
          .setFooter({ text: 'Santuario Mocho 🌑' })
          .setTimestamp()
      ],
      flags: MessageFlags.Ephemeral
    });
  }
};
