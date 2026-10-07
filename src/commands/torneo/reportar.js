const { EmbedBuilder, MessageFlags } = require('discord.js');
const T = require('../../utils/torneos');
const { COLOR_PUNTOS, FOOTER, errorEmbed, embedLlaves, botonesConfirmacion } = require('../../utils/torneo-embeds');

// Reporte del ganador de una llave (formato eliminación)
module.exports = async (interaction, torneo) => {
    const guildId = interaction.guildId;

    if (torneo.formato !== 'eliminacion') {
        return interaction.reply({ embeds: [errorEmbed('Este torneo no usa formato de eliminación. Usa `/torneo reportar-puntos`.')], flags: MessageFlags.Ephemeral });
    }
    if (torneo.estado !== 'en_curso') {
        return interaction.reply({ embeds: [errorEmbed('El torneo no está en curso.')], flags: MessageFlags.Ephemeral });
    }

    const numLlave = interaction.options.getInteger('llave');
    const ladoGanador = interaction.options.getString('ganador');
    const llave = T.llavesDeRonda(torneo, torneo.ronda).find(l => l.numero === numLlave);

    if (!llave) return interaction.reply({ embeds: [errorEmbed(`No existe la llave #${numLlave} en la ronda actual (${torneo.ronda}).`)], flags: MessageFlags.Ephemeral });
    if (llave.estado === 'confirmado') return interaction.reply({ embeds: [errorEmbed('Esa llave ya tiene un resultado confirmado.')], flags: MessageFlags.Ephemeral });
    if (!llave.a || !llave.b) return interaction.reply({ embeds: [errorEmbed('Esa llave todavía no tiene ambos participantes definidos.')], flags: MessageFlags.Ephemeral });

    const esAdmin = T.esOrganizador(interaction, torneo);
    const perteneceA = T.usuarioEsDelParticipante(torneo, llave.a, interaction.user.id);
    const perteneceB = T.usuarioEsDelParticipante(torneo, llave.b, interaction.user.id);

    if (!esAdmin && !perteneceA && !perteneceB) {
        return interaction.reply({ embeds: [errorEmbed('Solo los participantes de esta llave o un admin pueden reportar el resultado.')], flags: MessageFlags.Ephemeral });
    }

    const ganadorId = ladoGanador === 'a' ? llave.a : llave.b;

    if (esAdmin) {
        llave.ganador = ganadorId;
        llave.estado = 'confirmado';
        T.avanzarSiCorresponde(torneo);
        T.guardarTorneo(guildId, torneo);
        return interaction.reply({ embeds: [embedLlaves(torneo)] });
    }

    // Propuesta pendiente de confirmación del organizador
    const pendiente = {
        id: T.genId('r'),
        tipo: 'llave',
        llaveId: llave.id,
        ganadorId,
        proponeId: interaction.user.id,
        creadoEn: Date.now(),
    };
    torneo.pendientes.push(pendiente);
    llave.estado = 'propuesto';
    T.guardarTorneo(guildId, torneo);

    const embed = new EmbedBuilder()
        .setColor(COLOR_PUNTOS)
        .setTitle('🕓 Resultado propuesto')
        .setDescription(`**Llave ${llave.numero}** — <@${interaction.user.id}> propone como ganador a **${T.nombreParticipante(torneo, ganadorId)}**.\n\nEsperando confirmación de <@${torneo.organizadorId}> o un admin.`)
        .setFooter({ text: `ID: ${pendiente.id} • ${FOOTER}` });

    return interaction.reply({ embeds: [embed], components: [botonesConfirmacion(pendiente.id)] });
};
