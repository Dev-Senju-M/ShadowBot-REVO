const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, '../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-security-logs')
        .setDescription('Configura el canal de logs de seguridad (roles, canales, webhooks, etc.) (Admin only)')
        .addChannelOption(opt =>
            opt.setName('canal').setDescription('Canal donde se registrarán los eventos de seguridad').setRequired(true))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const canal = interaction.options.getChannel('canal');
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        config.securityLogChannel = canal.id;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('#57F287')
                    .setTitle('✅ Canal de Logs de Seguridad Configurado')
                    .setDescription(`Los logs de seguridad (roles peligrosos, canales, webhooks, desbaneos, etc.) se enviarán a <#${canal.id}>`)
                    .setFooter({ text: 'Santuario Mocho 🌑' })
                    .setTimestamp()
            ],
            flags: MessageFlags.Ephemeral
        });
    }
};