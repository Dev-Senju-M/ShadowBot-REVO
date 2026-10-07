const { EmbedBuilder, MessageFlags } = require('discord.js');
const T = require('../../utils/torneos');
const { COLOR_PUNTOS, FOOTER, errorEmbed, embedTabla, botonesConfirmacion } = require('../../utils/torneo-embeds');

// Reporte de kills y posición de una partida (formato puntos)
module.exports = async (interaction, torneo) => {
    const guildId = interaction.guildId;

    if (torneo.formato !== 'puntos') {
        return interaction.reply({ embeds: [errorEmbed('Este torneo no usa formato de puntos. Usa `/torneo reportar`.')], flags: MessageFlags.Ephemeral });
    }
    if (torneo.estado !== 'en_curso') {
        return interaction.reply({ embeds: [errorEmbed('El torneo no está en curso.')], flags: MessageFlags.Ephemeral });
    }

    const numPartida = interaction.options.getInteger('partida');
    const kills = interaction.options.getInteger('kills');
    const posicion = interaction.options.getInteger('posicion');

    const participante = T.participanteDeUsuario(torneo, interaction.user.id);
    const esAdmin = T.esOrganizador(interaction, torneo);
    if (!participante && !esAdmin) {
        return interaction.reply({ embeds: [errorEmbed('No estás inscrito en este torneo.')], flags: MessageFlags.Ephemeral });
    }
    if (!participante && esAdmin) {
        return interaction.reply({ embeds: [errorEmbed('Como admin, pide al capitán/jugador que reporte, o usa `/torneo reportar-puntos` desde su cuenta. (Reporte directo de admin para terceros aún no soportado).')], flags: MessageFlags.Ephemeral });
    }

    let partida = torneo.partidas.find(p => p.numero === numPartida);
    if (!partida) {
        partida = { numero: numPartida, reportes: [] };
        torneo.partidas.push(partida);
    }

    const existente = partida.reportes.find(r => r.participanteId === participante.id);
    if (existente && existente.confirmado) {
        return interaction.reply({ embeds: [errorEmbed(`Ya hay un resultado confirmado para **${participante.nombre}** en la partida ${numPartida}.`)], flags: MessageFlags.Ephemeral });
    }

    const puntos = T.calcularPuntosReporte(torneo, kills, posicion);

    if (esAdmin) {
        if (existente) Object.assign(existente, { kills, posicion, puntos, confirmado: true, reportadoPor: interaction.user.id });
        else partida.reportes.push({ participanteId: participante.id, kills, posicion, puntos, confirmado: true, reportadoPor: interaction.user.id });
        T.guardarTorneo(guildId, torneo);
        return interaction.reply({ embeds: [embedTabla(torneo)] });
    }

    // Propuesta pendiente
    if (existente) Object.assign(existente, { kills, posicion, puntos, confirmado: false, reportadoPor: interaction.user.id });
    else partida.reportes.push({ participanteId: participante.id, kills, posicion, puntos, confirmado: false, reportadoPor: interaction.user.id });

    const pendiente = {
        id: T.genId('r'),
        tipo: 'puntos',
        partidaNumero: numPartida,
        participanteId: participante.id,
        proponeId: interaction.user.id,
        creadoEn: Date.now(),
    };
    torneo.pendientes.push(pendiente);
    T.guardarTorneo(guildId, torneo);

    const embed = new EmbedBuilder()
        .setColor(COLOR_PUNTOS)
        .setTitle('🕓 Resultado propuesto')
        .setDescription(`**${participante.nombre}** — Partida ${numPartida}\nKills: **${kills}** • Posición: **#${posicion}** • Puntos: **${puntos}**\n\nEsperando confirmación de <@${torneo.organizadorId}> o un admin.`)
        .setFooter({ text: `ID: ${pendiente.id} • ${FOOTER}` });

    return interaction.reply({ embeds: [embed], components: [botonesConfirmacion(pendiente.id)] });
};
