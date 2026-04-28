const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-goodbye')
    .setDescription('Configura el sistema de despedida')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal donde se enviarán las despedidas')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('mensaje')
        .setDescription('Mensaje de despedida. Usa {user} para mencionar y {tag} para el nombre')
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName('color')
        .setDescription('Color del embed en HEX (ej: #ED4245)')
        .setRequired(false)),

  async execute(interaction) {
    const canal = interaction.options.getChannel('canal');
    const mensaje = interaction.options.getString('mensaje');
    const color = interaction.options.getString('color');

    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    config.goodbyeChannel = canal.id;
    if (mensaje) config.goodbyeMessage = mensaje;
    if (color) config.goodbyeColor = color;

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const embed = new EmbedBuilder()
      .setColor('#ED4245')
      .setTitle('✅ Sistema de despedida configurado')
      .addFields(
        { name: '📢 Canal', value: `<#${canal.id}>`, inline: true },
        { name: '💬 Mensaje', value: config.goodbyeMessage, inline: false },
        { name: '🎨 Color', value: config.goodbyeColor, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};