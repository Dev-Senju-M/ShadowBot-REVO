const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-modlog')
    .setDescription('Configura el canal de logs de moderación (Admin only)')
    .addChannelOption(opt =>
      opt.setName('canal').setDescription('Canal donde se registrarán las acciones de moderación').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    const canal = interaction.options.getChannel('canal');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    config.modLogChannel = canal.id;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('✅ Canal de Logs Configurado')
          .setDescription(`Los logs de moderación se enviarán a <#${canal.id}>`)
          .setFooter({ text: 'Santuario Mocho 🌑' })
          .setTimestamp()
      ],
      ephemeral: true
    });
  }
};
