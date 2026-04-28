const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-welcome')
    .setDescription('Configura el sistema de bienvenida')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(opt =>
      opt.setName('canal')
        .setDescription('Canal donde se enviarán las bienvenidas')
        .setRequired(true))
    .addChannelOption(opt =>
      opt.setName('reglas')
        .setDescription('Canal de reglas a mencionar')
        .setRequired(true))
    .addRoleOption(opt =>
      opt.setName('rol')
        .setDescription('Rol que se asignará automáticamente al entrar')
        .setRequired(true))
    .addStringOption(opt =>
      opt.setName('mensaje')
        .setDescription('Mensaje de bienvenida. Usa {user} para mencionar y {tag} para el nombre')
        .setRequired(false))
    .addStringOption(opt =>
      opt.setName('color')
        .setDescription('Color del embed en HEX (ej: #57F287)')
        .setRequired(false)),

  async execute(interaction) {
    const canal = interaction.options.getChannel('canal');
    const reglas = interaction.options.getChannel('reglas');
    const rol = interaction.options.getRole('rol');
    const mensaje = interaction.options.getString('mensaje');
    const color = interaction.options.getString('color');

    // Leer config actual
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Actualizar valores
    config.welcomeChannel = canal.id;
    config.rulesChannel = reglas.id;
    config.autoRole = rol.id;
    if (mensaje) config.welcomeMessage = mensaje;
    if (color) config.welcomeColor = color;

    // Guardar
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('✅ Sistema de bienvenida configurado')
      .addFields(
        { name: '📢 Canal', value: `<#${canal.id}>`, inline: true },
        { name: '📌 Reglas', value: `<#${reglas.id}>`, inline: true },
        { name: '🎭 Rol automático', value: `<@&${rol.id}>`, inline: true },
        { name: '💬 Mensaje', value: config.welcomeMessage, inline: false },
        { name: '🎨 Color', value: config.welcomeColor, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};