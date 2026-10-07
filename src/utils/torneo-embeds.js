// Embeds y botones del sistema de torneos (commands/torneo y events/torneo-panel)
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const T = require('./torneos');

const COLOR_INFO = '#5865F2';
const COLOR_OK = '#57F287';
const COLOR_ERR = '#ED4245';
const COLOR_PUNTOS = '#FEE75C';
const FOOTER = 'Sistema de Torneos • Santuario Mocho 🌑';

function errorEmbed(msg) {
    return new EmbedBuilder().setColor(COLOR_ERR).setDescription(`❌ ${msg}`);
}

function embedTorneoCreado(torneo) {
    return new EmbedBuilder()
        .setColor(COLOR_OK)
        .setTitle(`🏆 Torneo creado: ${torneo.nombre}`)
        .addFields(
            { name: '🎮 Juego', value: torneo.juego, inline: true },
            { name: '📋 Formato', value: torneo.formato === 'eliminacion' ? 'Eliminación (llaves)' : 'Puntos / Liga', inline: true },
            { name: '👥 Modo', value: torneo.modo === 'equipos' ? `Equipos (${torneo.tamanoEquipo} jugadores)` : 'Individual', inline: true },
        )
        .setDescription(`Usa \`/torneo inscribir\` para anotarte. Cuando estén listos, el organizador usa \`/torneo iniciar\`.`)
        .setFooter({ text: FOOTER })
        .setTimestamp();
}

function embedLista(torneo) {
    const embed = new EmbedBuilder()
        .setColor(COLOR_INFO)
        .setTitle(`📋 Participantes — ${torneo.nombre}`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

    if (torneo.participantes.length === 0) {
        embed.setDescription('Nadie se ha inscrito todavía. Usa `/torneo inscribir`.');
        return embed;
    }

    const lista = torneo.participantes.map((p, i) => {
        if (torneo.modo === 'equipos') {
            const miembros = p.miembros.map(id => `<@${id}>`).join(', ');
            return `**${i + 1}. ${p.nombre}** — Capitán: <@${p.capitanId}>\n   Integrantes: ${miembros}`;
        }
        return `**${i + 1}.** <@${p.miembros[0]}>`;
    }).join('\n\n');

    embed.setDescription(lista);
    embed.addFields({ name: 'Total', value: `${torneo.participantes.length} ${torneo.modo === 'equipos' ? 'equipos' : 'jugadores'}`, inline: true });
    return embed;
}

function embedLlaves(torneo) {
    const ronda = T.llavesDeRonda(torneo, torneo.ronda);

    const embed = new EmbedBuilder()
        .setColor(COLOR_INFO)
        .setTitle(`🏆 ${torneo.nombre} — Ronda ${torneo.ronda}`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

    if (torneo.estado === 'finalizado') {
        embed.setColor(COLOR_OK);
        embed.setTitle(`🏆 ${torneo.nombre} — ¡Torneo finalizado!`);
        embed.setDescription(`🥇 **Campeón: ${T.nombreParticipante(torneo, torneo.ganadorFinal)}** 🎉`);
        return embed;
    }

    const lineas = ronda.map(l => {
        const nombreA = T.nombreParticipante(torneo, l.a);
        const nombreB = T.nombreParticipante(torneo, l.b);
        let estadoTxt = '⏳ Pendiente';
        if (l.estado === 'confirmado') estadoTxt = `✅ Ganó **${T.nombreParticipante(torneo, l.ganador)}**`;
        else if (l.estado === 'propuesto') estadoTxt = '🕓 Resultado propuesto, esperando confirmación';
        return `**Llave ${l.numero}:** ${nombreA} 🆚 ${nombreB}\n${estadoTxt}`;
    }).join('\n\n');

    embed.setDescription(lineas || 'Sin llaves generadas.');
    return embed;
}

function embedTabla(torneo) {
    const tabla = T.calcularTabla(torneo);
    const embed = new EmbedBuilder()
        .setColor(COLOR_PUNTOS)
        .setTitle(`📊 Tabla de posiciones — ${torneo.nombre}`)
        .setFooter({ text: FOOTER })
        .setTimestamp();

    if (tabla.every(t => t.partidasJugadas === 0)) {
        embed.setDescription('Todavía no hay resultados reportados. Usa `/torneo reportar-puntos`.');
        return embed;
    }

    const medallas = ['🥇', '🥈', '🥉'];
    const lineas = tabla.map((t, i) => {
        const medalla = medallas[i] || `${i + 1}.`;
        return `${medalla} **${t.nombre}** — ${t.puntos} pts *(${t.kills} kills, ${t.partidasJugadas} partidas)*`;
    }).join('\n');

    embed.setDescription(lineas);
    embed.addFields({
        name: 'Puntuación',
        value: `${torneo.puntosConfig.porKill} pt(s) por kill • Posición: ${Object.entries(torneo.puntosConfig.porPosicion).map(([k, v]) => `#${k}=${v}`).join(', ')}`,
    });
    return embed;
}

function botonesConfirmacion(pendienteId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`torneo_confirmar_${pendienteId}`).setLabel('✅ Confirmar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`torneo_rechazar_${pendienteId}`).setLabel('❌ Rechazar').setStyle(ButtonStyle.Danger),
    );
}

module.exports = {
    COLOR_INFO, COLOR_OK, COLOR_ERR, COLOR_PUNTOS, FOOTER,
    errorEmbed, embedTorneoCreado, embedLista, embedLlaves, embedTabla, botonesConfirmacion,
};
