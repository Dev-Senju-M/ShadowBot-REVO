const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const T = require('../utils/torneos');
const { errorEmbed } = require('../utils/torneo-embeds');

// Cada subcomando vive en commands/torneo/<subcomando>.js y exporta (interaction, torneo) => {...}
const SUBCOMANDOS = ['crear', 'inscribir', 'lista', 'iniciar', 'ver', 'configurar-puntos', 'reportar', 'reportar-puntos', 'cancelar'];
const handlers = Object.fromEntries(SUBCOMANDOS.map(sub => [sub, require(`./torneo/${sub}`)]));

function torneosDisponibles(guildId) {
    return T.getTorneosGuild(guildId);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('torneo')
        .setDescription('Sistema de torneos (Fortnite, Valorant, y más)')
        .addSubcommand(sub => sub.setName('crear').setDescription('Crea un nuevo torneo (Admin)')
            .addStringOption(o => o.setName('nombre').setDescription('Nombre del torneo').setRequired(true))
            .addStringOption(o => o.setName('juego').setDescription('Juego (ej: Fortnite, Valorant)').setRequired(true))
            .addStringOption(o => o.setName('formato').setDescription('Formato del torneo').setRequired(true)
                .addChoices(
                    { name: 'Eliminación (llaves 1v1 o equipo vs equipo)', value: 'eliminacion' },
                    { name: 'Puntos / Liga (kills + posición, ej. Battle Royale)', value: 'puntos' },
                ))
            .addStringOption(o => o.setName('modo').setDescription('Cómo se inscriben los participantes').setRequired(true)
                .addChoices(
                    { name: 'Equipos', value: 'equipos' },
                    { name: 'Individual', value: 'individual' },
                ))
            .addIntegerOption(o => o.setName('tamano_equipo').setDescription('Jugadores por equipo (solo modo equipos)').setMinValue(2).setMaxValue(10))
            .addChannelOption(o => o.setName('canal').setDescription('Canal donde se publicarán las actualizaciones (default: este canal)')))
        .addSubcommand(sub => sub.setName('inscribir').setDescription('Inscríbete o inscribe a tu equipo')
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true))
            .addStringOption(o => o.setName('nombre_equipo').setDescription('Nombre del equipo (solo modo equipos)'))
            .addUserOption(o => o.setName('integrante2').setDescription('Integrante 2'))
            .addUserOption(o => o.setName('integrante3').setDescription('Integrante 3'))
            .addUserOption(o => o.setName('integrante4').setDescription('Integrante 4'))
            .addUserOption(o => o.setName('integrante5').setDescription('Integrante 5'))
            .addUserOption(o => o.setName('integrante6').setDescription('Integrante 6')))
        .addSubcommand(sub => sub.setName('lista').setDescription('Ver participantes inscritos')
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('iniciar').setDescription('Cierra inscripciones y arranca el torneo (Admin)')
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('ver').setDescription('Ver llaves actuales o tabla de posiciones')
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('reportar').setDescription('Reporta el ganador de una llave (formato eliminación)')
            .addIntegerOption(o => o.setName('llave').setDescription('Número de la llave').setRequired(true))
            .addStringOption(o => o.setName('ganador').setDescription('Quién ganó').setRequired(true)
                .addChoices({ name: 'Equipo/Jugador A', value: 'a' }, { name: 'Equipo/Jugador B', value: 'b' }))
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('reportar-puntos').setDescription('Reporta kills y posición de tu partida (formato puntos)')
            .addIntegerOption(o => o.setName('partida').setDescription('Número de partida/ronda').setRequired(true).setMinValue(1))
            .addIntegerOption(o => o.setName('kills').setDescription('Kills obtenidas').setRequired(true).setMinValue(0))
            .addIntegerOption(o => o.setName('posicion').setDescription('Posición final (1 = victoria)').setRequired(true).setMinValue(1))
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('configurar-puntos').setDescription('Configura la puntuación del formato puntos (Admin)')
            .addIntegerOption(o => o.setName('por_kill').setDescription('Puntos por cada kill').setRequired(true).setMinValue(0))
            .addStringOption(o => o.setName('tabla_posiciones').setDescription('Ej: 1=10,2=6,3=5,4=4,5=3').setRequired(true))
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('cancelar').setDescription('Cancela un torneo (Admin)')
            .addStringOption(o => o.setName('torneo').setDescription('Nombre del torneo').setAutocomplete(true))),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const guildId = interaction.guildId;
        if (focused.name === 'torneo') {
            const lista = torneosDisponibles(guildId);
            const filtradas = lista
                .filter(t => t.nombre.toLowerCase().includes(focused.value.toLowerCase()))
                .slice(0, 25)
                .map(t => ({ name: `${t.nombre} (${t.estado})`, value: t.nombre }));
            await interaction.respond(filtradas).catch(() => {});
        }
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (sub === 'crear') return handlers.crear(interaction);

        // Para el resto de subcomandos necesitamos localizar el torneo
        const nombreTorneo = interaction.options.getString('torneo');
        const torneo = T.buscarTorneo(guildId, nombreTorneo);

        if (!torneo) {
            const lista = torneosDisponibles(guildId);
            if (lista.length === 0) return interaction.reply({ embeds: [errorEmbed('No hay torneos creados todavía. Usa `/torneo crear`.')], flags: MessageFlags.Ephemeral });
            return interaction.reply({ embeds: [errorEmbed('Especifica el torneo con la opción `torneo` (hay varios activos).')], flags: MessageFlags.Ephemeral });
        }

        return handlers[sub](interaction, torneo);
    },
};
