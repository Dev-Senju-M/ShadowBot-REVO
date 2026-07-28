const { EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const T = require('../utils/torneos');
const { embedLlaves, embedTabla } = require('../commands/torneo');

const COLOR_OK = '#57F287';
const COLOR_ERR = '#ED4245';

function esOrganizador(interaction, torneo) {
    return interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
        interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        interaction.user.id === torneo.organizadorId;
}

function buscarTorneoConPendiente(guildId, pendienteId) {
    const lista = T.getTorneosGuild(guildId);
    for (const torneo of lista) {
        const p = (torneo.pendientes || []).find(p => p.id === pendienteId);
        if (p) return { torneo, pendiente: p };
    }
    return null;
}

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('torneo_confirmar_') && !interaction.customId.startsWith('torneo_rechazar_')) return;

        try {
            const esConfirmar = interaction.customId.startsWith('torneo_confirmar_');
            const pendienteId = interaction.customId.replace(esConfirmar ? 'torneo_confirmar_' : 'torneo_rechazar_', '');
            const guildId = interaction.guildId;

            const encontrado = buscarTorneoConPendiente(guildId, pendienteId);
            if (!encontrado) {
                return interaction.reply({ content: '❌ Esta propuesta ya no existe o ya fue procesada.', flags: MessageFlags.Ephemeral });
            }
            const { torneo, pendiente } = encontrado;

            if (!esOrganizador(interaction, torneo)) {
                return interaction.reply({ content: '❌ Solo el organizador o un admin puede confirmar/rechazar resultados.', flags: MessageFlags.Ephemeral });
            }

            torneo.pendientes = torneo.pendientes.filter(p => p.id !== pendienteId);

            let resultadoTxt;
            let embedActualizado;

            if (pendiente.tipo === 'llave') {
                const llave = torneo.llaves.find(l => l.id === pendiente.llaveId);
                if (esConfirmar) {
                    llave.ganador = pendiente.ganadorId;
                    llave.estado = 'confirmado';
                    T.avanzarSiCorresponde(torneo);
                    resultadoTxt = `✅ Confirmado: ganó **${T.nombreParticipante(torneo, pendiente.ganadorId)}**.`;
                } else {
                    llave.estado = 'pendiente';
                    resultadoTxt = '❌ Propuesta rechazada. La llave sigue pendiente de reporte.';
                }
                T.guardarTorneo(guildId, torneo);
                embedActualizado = embedLlaves(torneo);
            } else if (pendiente.tipo === 'puntos') {
                const partida = torneo.partidas.find(p => p.numero === pendiente.partidaNumero);
                const reporte = partida?.reportes.find(r => r.participanteId === pendiente.participanteId);
                if (esConfirmar && reporte) {
                    reporte.confirmado = true;
                    resultadoTxt = '✅ Resultado confirmado y agregado a la tabla.';
                } else if (partida) {
                    partida.reportes = partida.reportes.filter(r => r.participanteId !== pendiente.participanteId);
                    resultadoTxt = '❌ Propuesta rechazada.';
                }
                T.guardarTorneo(guildId, torneo);
                embedActualizado = embedTabla(torneo);
            }

            const estadoEmbed = new EmbedBuilder()
                .setColor(esConfirmar ? COLOR_OK : COLOR_ERR)
                .setDescription(`${resultadoTxt}\n\n*Resuelto por <@${interaction.user.id}>*`);

            await interaction.update({ embeds: [estadoEmbed], components: [] });

            if (embedActualizado) {
                await interaction.followUp({ embeds: [embedActualizado] }).catch(() => {});
            }
        } catch (error) {
            console.error('[torneo-panel] error:', error);
            const payload = { content: '❌ Ocurrió un error procesando la acción.', flags: MessageFlags.Ephemeral };
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(payload).catch(() => {});
            } else {
                await interaction.reply(payload).catch(() => {});
            }
        }
    });
};