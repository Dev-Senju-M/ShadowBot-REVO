const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const { getPersonalidad, savePersonalidad, MODELOS_VALIDOS, DEFAULT_PERSONALIDAD } = require('../utils/ai');

const FOOTER = 'Sistema de IA • Santuario Mocho 🌑';

function embedEstado(personalidad, titulo) {
    return new EmbedBuilder()
        .setColor('#8400ff')
        .setTitle(titulo)
        .addFields(
            { name: '🎭 Nombre', value: personalidad.nombre, inline: true },
            { name: '⚙️ Estado', value: personalidad.activada !== false ? '✅ Activada' : '⛔ Desactivada', inline: true },
            { name: '🧠 Modelo', value: personalidad.modelo, inline: true },
            { name: '📝 Personalidad', value: personalidad.personalidad.slice(0, 1000) },
        )
        .setFooter({ text: FOOTER })
        .setTimestamp();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ia')
        .setDescription('Configura la personalidad y el comportamiento de la IA del bot')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(opt =>
            opt.setName('nombre')
                .setDescription('Nombre con el que se presenta la IA')
                .setRequired(false)
                .setMaxLength(32))
        .addStringOption(opt =>
            opt.setName('personalidad')
                .setDescription('Describe el tono/carácter de la IA (system prompt)')
                .setRequired(false)
                .setMaxLength(1500))
        .addStringOption(opt =>
            opt.setName('modelo')
                .setDescription('Qué tan potente/rápido debe ser el modelo')
                .setRequired(false)
                .addChoices(
                    { name: 'Rápido (recomendado, más barato)', value: MODELOS_VALIDOS.rapido },
                    { name: 'Equilibrado (más capaz, más lento/caro)', value: MODELOS_VALIDOS.equilibrado },
                ))
        .addBooleanOption(opt =>
            opt.setName('activada')
                .setDescription('Activa o desactiva /ask y las demás funciones de IA')
                .setRequired(false))
        .addBooleanOption(opt =>
            opt.setName('restablecer')
                .setDescription('Restaura la personalidad por defecto (ignora las demás opciones)')
                .setRequired(false)),

    async execute(interaction) {
        const restablecer = interaction.options.getBoolean('restablecer');

        if (restablecer) {
            const personalidad = savePersonalidad(DEFAULT_PERSONALIDAD);
            await interaction.reply({
                embeds: [embedEstado(personalidad, '🔄 Personalidad restablecida')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const nombre = interaction.options.getString('nombre');
        const personalidadTexto = interaction.options.getString('personalidad');
        const modelo = interaction.options.getString('modelo');
        const activada = interaction.options.getBoolean('activada');

        const cambios = {};
        if (nombre) cambios.nombre = nombre;
        if (personalidadTexto) cambios.personalidad = personalidadTexto;
        if (modelo) cambios.modelo = modelo;
        if (activada !== null) cambios.activada = activada;

        if (Object.keys(cambios).length === 0) {
            await interaction.reply({
                embeds: [embedEstado(getPersonalidad(), '🎭 Configuración actual de la IA')],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const personalidad = savePersonalidad(cambios);
        await interaction.reply({
            embeds: [embedEstado(personalidad, '✅ Configuración de IA actualizada')],
            flags: MessageFlags.Ephemeral,
        });
    },
};
