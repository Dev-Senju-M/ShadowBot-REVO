const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-logs')
        .setDescription('Configura el canal de logs de actividad (voz, miembros, mensajes, perfiles)')
        .addChannelOption(opt =>
            opt.setName('canal')
                .setDescription('Canal donde se registrará la actividad del servidor')
                .setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const canal = interaction.options.getChannel('canal');

        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.logsChannel = canal.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ Canal de Logs de Actividad Configurado')
                    .setDescription(`Voz, miembros, mensajes y cambios de perfil se enviarán a <#${canal.id}>`)
                    .setFooter({ text: 'Santuario Mocho 🌑' })
                    .setTimestamp()
            ],
            flags: MessageFlags.Ephemeral
        });
    }
};