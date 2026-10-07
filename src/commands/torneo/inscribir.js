const { EmbedBuilder, MessageFlags } = require('discord.js');
const T = require('../../utils/torneos');
const { COLOR_OK, errorEmbed } = require('../../utils/torneo-embeds');

module.exports = async (interaction, torneo) => {
    const guildId = interaction.guildId;

    if (torneo.estado !== 'inscripciones') {
        return interaction.reply({ embeds: [errorEmbed('Las inscripciones para este torneo ya están cerradas.')], flags: MessageFlags.Ephemeral });
    }

    const yaInscrito = T.participanteDeUsuario(torneo, interaction.user.id);
    if (yaInscrito) {
        return interaction.reply({ embeds: [errorEmbed(`Ya estás inscrito en **${yaInscrito.nombre}**.`)], flags: MessageFlags.Ephemeral });
    }

    if (torneo.modo === 'individual') {
        torneo.participantes.push({
            id: T.genId('p'),
            nombre: interaction.user.username,
            capitanId: interaction.user.id,
            miembros: [interaction.user.id],
        });
        T.guardarTorneo(guildId, torneo);
        return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLOR_OK).setDescription(`✅ <@${interaction.user.id}> se inscribió en **${torneo.nombre}**.`)] });
    }

    // modo equipos
    const nombreEquipo = interaction.options.getString('nombre_equipo');
    if (!nombreEquipo) {
        return interaction.reply({ embeds: [errorEmbed('Este torneo es por equipos. Indica `nombre_equipo`.')], flags: MessageFlags.Ephemeral });
    }
    if (torneo.participantes.some(p => p.nombre.toLowerCase() === nombreEquipo.toLowerCase())) {
        return interaction.reply({ embeds: [errorEmbed(`Ya existe un equipo llamado **${nombreEquipo}**.`)], flags: MessageFlags.Ephemeral });
    }

    const integrantes = [2, 3, 4, 5, 6]
        .map(n => interaction.options.getUser(`integrante${n}`))
        .filter(Boolean);

    const miembros = [interaction.user.id, ...integrantes.map(u => u.id)];
    const unicos = [...new Set(miembros)];

    if (unicos.length > torneo.tamanoEquipo) {
        return interaction.reply({ embeds: [errorEmbed(`Este torneo permite equipos de máximo ${torneo.tamanoEquipo} jugadores. Diste ${unicos.length}.`)], flags: MessageFlags.Ephemeral });
    }

    for (const uid of unicos) {
        if (T.participanteDeUsuario(torneo, uid)) {
            return interaction.reply({ embeds: [errorEmbed(`<@${uid}> ya está inscrito en otro equipo de este torneo.`)], flags: MessageFlags.Ephemeral });
        }
    }

    torneo.participantes.push({
        id: T.genId('p'),
        nombre: nombreEquipo,
        capitanId: interaction.user.id,
        miembros: unicos,
    });
    T.guardarTorneo(guildId, torneo);

    return interaction.reply({
        embeds: [new EmbedBuilder().setColor(COLOR_OK)
            .setTitle('✅ Equipo inscrito')
            .setDescription(`**${nombreEquipo}**\nCapitán: <@${interaction.user.id}>\nIntegrantes: ${unicos.map(id => `<@${id}>`).join(', ')}`)],
    });
};
