const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const store = require('../utils/db');


module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-verificacion')
        .setDescription('Configura el rol que se da ANTES de verificar (para que el botón ¡Verificar! sirva de algo)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addRoleOption(opt =>
            opt.setName('rol_sin_verificar')
                .setDescription('Rol limitado que se asigna automáticamente al entrar, antes de verificar')
                .setRequired(true)),

    async execute(interaction) {
        const rol = interaction.options.getRole('rol_sin_verificar');
        const config = store.get('config');

        if (config.autoRole && rol.id === config.autoRole) {
            return interaction.reply({
                content: '❌ Ese rol es el mismo que el rol de miembro verificado (`autoRole`). Debe ser un rol distinto, con menos permisos, o el botón de verificar seguirá sin tener efecto.',
                flags: MessageFlags.Ephemeral,
            });
        }

        config.unverifiedRole = rol.id;
        store.set('config', config);

        const embed = new EmbedBuilder()
            .setColor('#57F287')
            .setTitle('✅ Verificación configurada')
            .setDescription(
                `Ahora, cuando alguien entre al servidor recibirá el rol <@&${rol.id}> automáticamente. ` +
                `Al presionar **¡Verificar!** en las reglas, se le quitará ese rol y se le dará el rol de miembro ` +
                `(<@&${config.autoRole || '—'}>).`
            )
            .setFooter({ text: 'Recuerda: el rol sin verificar debe tener acceso restringido a los canales.' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
};