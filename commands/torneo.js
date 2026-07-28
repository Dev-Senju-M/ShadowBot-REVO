const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');

const T = require('../utils/torneos');

const COLOR_INFO = '#5865F2';
const COLOR_OK = '#57F287';
const COLOR_ERR = '#ED4245';
const COLOR_PUNTOS = '#FEE75C';
const FOOTER = 'Sistema de Torneos • Santuario Mocho 🌑';

function esOrganizador(interaction, torneo) {
    return interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
        interaction.member.permissions.has(PermissionFlagsBits.ManageGuild) ||
        interaction.user.id === torneo.organizadorId;
}

function torneosDisponibles(guildId) {
    return T.getTorneosGuild(guildId);
}

function errorEmbed(msg) {
    return new EmbedBuilder().setColor(COLOR_ERR).setDescription(`❌ ${msg}`);
}

// ————————————————————————————————————————————————
// Embeds
// ————————————————————————————————————————————————

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

// ————————————————————————————————————————————————
// Comando
// ————————————————————————————————————————————————

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

        // — CREAR —
        if (sub === 'crear') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                return interaction.reply({ embeds: [errorEmbed('Necesitas el permiso "Gestionar servidor" para crear torneos.')], flags: MessageFlags.Ephemeral });
            }

            const nombre = interaction.options.getString('nombre');
            const juego = interaction.options.getString('juego');
            const formato = interaction.options.getString('formato');
            const modo = interaction.options.getString('modo');
            const tamanoEquipo = interaction.options.getInteger('tamano_equipo');
            const canal = interaction.options.getChannel('canal') || interaction.channel;

            if (T.buscarTorneo(guildId, nombre)) {
                return interaction.reply({ embeds: [errorEmbed(`Ya existe un torneo llamado **${nombre}**. Elige otro nombre.`)], flags: MessageFlags.Ephemeral });
            }

            const torneo = T.crearTorneo({
                guildId, nombre, juego, formato, modo,
                tamanoEquipo: modo === 'equipos' ? (tamanoEquipo || 2) : 1,
                canalId: canal.id,
                organizadorId: interaction.user.id,
            });

            await interaction.reply({ embeds: [embedTorneoCreado(torneo)] });
            if (canal.id !== interaction.channelId) {
                await canal.send({ embeds: [embedTorneoCreado(torneo)] }).catch(() => {});
            }
            return;
        }

        // Para el resto de subcomandos necesitamos localizar el torneo
        const nombreTorneo = interaction.options.getString('torneo');
        const torneo = T.buscarTorneo(guildId, nombreTorneo);

        if (!torneo) {
            const lista = torneosDisponibles(guildId);
            if (lista.length === 0) return interaction.reply({ embeds: [errorEmbed('No hay torneos creados todavía. Usa `/torneo crear`.')], flags: MessageFlags.Ephemeral });
            return interaction.reply({ embeds: [errorEmbed('Especifica el torneo con la opción `torneo` (hay varios activos).')], flags: MessageFlags.Ephemeral });
        }

        // — INSCRIBIR —
        if (sub === 'inscribir') {
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
        }

        // — LISTA —
        if (sub === 'lista') {
            return interaction.reply({ embeds: [embedLista(torneo)] });
        }

        // — INICIAR —
        if (sub === 'iniciar') {
            if (!esOrganizador(interaction, torneo)) {
                return interaction.reply({ embeds: [errorEmbed('Solo el organizador o un admin puede iniciar el torneo.')], flags: MessageFlags.Ephemeral });
            }
            if (torneo.estado !== 'inscripciones') {
                return interaction.reply({ embeds: [errorEmbed('Este torneo ya fue iniciado.')], flags: MessageFlags.Ephemeral });
            }
            if (torneo.participantes.length < 2) {
                return interaction.reply({ embeds: [errorEmbed('Necesitas al menos 2 participantes inscritos para iniciar.')], flags: MessageFlags.Ephemeral });
            }

            let embed;
            if (torneo.formato === 'eliminacion') {
                T.generarLlaves(torneo);
                T.guardarTorneo(guildId, torneo);
                embed = embedLlaves(torneo);
            } else {
                torneo.estado = 'en_curso';
                T.guardarTorneo(guildId, torneo);
                embed = embedTabla(torneo);
            }

            await interaction.reply({ content: `🚀 **¡${torneo.nombre} ha comenzado!**`, embeds: [embed] });
            return;
        }

        // — VER —
        if (sub === 'ver') {
            const embed = torneo.formato === 'eliminacion' ? embedLlaves(torneo) : embedTabla(torneo);
            return interaction.reply({ embeds: [embed] });
        }

        // — CONFIGURAR-PUNTOS —
        if (sub === 'configurar-puntos') {
            if (!esOrganizador(interaction, torneo)) {
                return interaction.reply({ embeds: [errorEmbed('Solo el organizador o un admin puede configurar la puntuación.')], flags: MessageFlags.Ephemeral });
            }
            if (torneo.formato !== 'puntos') {
                return interaction.reply({ embeds: [errorEmbed('Este torneo no usa formato de puntos.')], flags: MessageFlags.Ephemeral });
            }

            const porKill = interaction.options.getInteger('por_kill');
            const tablaTxt = interaction.options.getString('tabla_posiciones');
            const porPosicion = {};
            for (const par of tablaTxt.split(',')) {
                const [pos, pts] = par.split('=').map(s => s.trim());
                if (!pos || pts === undefined || isNaN(Number(pos)) || isNaN(Number(pts))) {
                    return interaction.reply({ embeds: [errorEmbed('Formato inválido en `tabla_posiciones`. Usa algo como `1=10,2=6,3=5`.')], flags: MessageFlags.Ephemeral });
                }
                porPosicion[pos] = Number(pts);
            }

            torneo.puntosConfig = { porKill, porPosicion };
            T.guardarTorneo(guildId, torneo);

            return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLOR_OK).setTitle('✅ Puntuación actualizada')
                    .setDescription(`${porKill} pt(s) por kill\nPosición: ${Object.entries(porPosicion).map(([k, v]) => `#${k}=${v}`).join(', ')}`)] });
        }

        // — REPORTAR (eliminación) —
        if (sub === 'reportar') {
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

            const esAdmin = esOrganizador(interaction, torneo);
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
        }

        // — REPORTAR-PUNTOS —
        if (sub === 'reportar-puntos') {
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
            const esAdmin = esOrganizador(interaction, torneo);
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
        }

        // — CANCELAR —
        if (sub === 'cancelar') {
            if (!esOrganizador(interaction, torneo)) {
                return interaction.reply({ embeds: [errorEmbed('Solo el organizador o un admin puede cancelar el torneo.')], flags: MessageFlags.Ephemeral });
            }
            torneo.estado = 'cancelado';
            T.guardarTorneo(guildId, torneo);
            return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLOR_ERR).setDescription(`🚫 Torneo **${torneo.nombre}** cancelado.`)] });
        }
    },
};

module.exports.embedLlaves = embedLlaves;
module.exports.embedTabla = embedTabla;
module.exports.botonesConfirmacion = botonesConfirmacion;