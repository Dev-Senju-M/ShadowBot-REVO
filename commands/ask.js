const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { preguntarIA, getPersonalidad, segundosRestantesCooldown, marcarUso, AIError } = require('../utils/ai');

const FOOTER = 'Sistema de IA • Santuario Mocho 🌑';
const MAX_DESCRIPCION = 4000; // margen bajo el límite de 4096 de discord.js

function mensajeError(error) {
    if (error instanceof AIError) {
        if (error.tipo === 'sin_api_key') {
            return '⚠️ La IA no está configurada todavía. Un administrador debe agregar `ANTHROPIC_API_KEY` en el `.env` del bot.';
        }
        if (error.tipo === 'desactivada') {
            return '🌑 Las funciones de IA están desactivadas en este servidor. Un admin puede reactivarlas con `/setup-ia activada:true`.';
        }
        return `❌ ${error.message}`;
    }
    return '❌ Hubo un error inesperado al consultar la IA.';
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ask')
        .setDescription('Hazle una pregunta a la IA del bot')
        .addStringOption(opt =>
            opt.setName('pregunta')
                .setDescription('¿Qué quieres preguntar?')
                .setRequired(true)
                .setMaxLength(1500))
        .addBooleanOption(opt =>
            opt.setName('privado')
                .setDescription('Si la respuesta solo la puedes ver tú (por defecto: no)')
                .setRequired(false)),

    async execute(interaction) {
        const pregunta = interaction.options.getString('pregunta');
        const privado = interaction.options.getBoolean('privado') ?? false;

        const restante = segundosRestantesCooldown(interaction.user.id);
        if (restante > 0) {
            await interaction.reply({
                content: `⏳ Espera ${restante}s antes de volver a preguntarle algo a la IA.`,
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        await interaction.deferReply({ flags: privado ? MessageFlags.Ephemeral : undefined });
        marcarUso(interaction.user.id);

        try {
            const respuesta = await preguntarIA(pregunta);
            const personalidad = getPersonalidad();
            const descripcion = respuesta.length > MAX_DESCRIPCION
                ? respuesta.slice(0, MAX_DESCRIPCION) + '…'
                : respuesta;

            const embed = new EmbedBuilder()
                .setColor('#8400ff')
                .setAuthor({ name: personalidad.nombre || 'IA' })
                .addFields({ name: '💬 Pregunta', value: pregunta.slice(0, 1024) })
                .setDescription(descripcion)
                .setFooter({ text: FOOTER })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            await interaction.editReply({ content: mensajeError(error) });
        }
    },
};
