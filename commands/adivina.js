const {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { reproducirFragmento, detenerFragmento } = require('../utils/game-player');

const CANCIONES_PATH = path.join(__dirname, '..', 'canciones.json');

// Una partida activa como máximo por servidor
const partidasActivas = new Map(); // guildId -> partida

const TIEMPO_LOBBY_MS = 30_000;
const TIEMPO_BUZZ_MS = 15_000;
const TIEMPO_RESPUESTA_MS = 10_000;

function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // quita acentos
        .replace(/[^a-z0-9\s]/g, '')
        .trim();
}

function esRespuestaCorrecta(intento, validas) {
    const intentoNorm = normalizar(intento);
    return validas.some(v => normalizar(v) === intentoNorm);
}

function cargarCanciones() {
    const raw = fs.readFileSync(CANCIONES_PATH, 'utf-8');
    return JSON.parse(raw);
}

function barajar(array) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adivina')
        .setDescription('Juego de adivinar la canción con buzzer')
        .addSubcommand(sub => sub.setName('start').setDescription('Inicia una partida'))
        .addSubcommand(sub => sub.setName('stop').setDescription('Detiene la partida actual'))
        .addSubcommand(sub => sub.setName('score').setDescription('Muestra el marcador actual')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub === 'start') return iniciarPartida(interaction);
        if (sub === 'stop') return detenerPartida(interaction);
        if (sub === 'score') return mostrarMarcador(interaction);
    },
};

async function iniciarPartida(interaction) {
    const guildId = interaction.guild.id;

    if (partidasActivas.has(guildId)) {
        return interaction.reply({ content: '❌ Ya hay una partida en curso en este servidor.', flags: MessageFlags.Ephemeral });
    }

    const canal = interaction.member.voice.channel;
    if (!canal) {
        return interaction.reply({ content: '❌ Debes estar en un canal de voz.', flags: MessageFlags.Ephemeral });
    }

    const perms = canal.permissionsFor(interaction.guild.members.me);
    if (!perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
        return interaction.reply({ content: '❌ Necesito permisos de **Conectar** y **Hablar** en ese canal.', flags: MessageFlags.Ephemeral });
    }

    let canciones;
    try {
        canciones = cargarCanciones();
    } catch (err) {
        console.error('[adivina] Error leyendo canciones.json:', err);
        return interaction.reply({ content: '❌ No pude cargar el banco de canciones.', flags: MessageFlags.Ephemeral });
    }
    if (!canciones.length) {
        return interaction.reply({ content: '❌ El banco de canciones está vacío.', flags: MessageFlags.Ephemeral });
    }

    const partida = {
        guildId,
        canal,
        textChannel: interaction.channel,
        jugadores: new Map(), // userId -> { username, puntos }
        canciones: barajar(canciones),
        rondaActual: 0,
        activa: true,
        audioState: null,
    };
    partidasActivas.set(guildId, partida);

    const joinBtn = new ButtonBuilder().setCustomId('adivina_join').setLabel('🙋 Unirse').setStyle(ButtonStyle.Success);
    const lobbyMsg = await interaction.reply({
        content: `🎵 **Adivina la canción** — pulsa **Unirse** para jugar (${TIEMPO_LOBBY_MS / 1000}s)\n\n**Jugadores (0):**\n_nadie todavía_`,
        components: [new ActionRowBuilder().addComponents(joinBtn)],
        fetchReply: true,
    });

    const lobbyCollector = lobbyMsg.createMessageComponentCollector({
        filter: i => i.customId === 'adivina_join',
        time: TIEMPO_LOBBY_MS,
    });

    lobbyCollector.on('collect', async i => {
        if (partida.jugadores.has(i.user.id)) {
            return i.reply({ content: 'Ya estás en la partida.', flags: MessageFlags.Ephemeral });
        }
        partida.jugadores.set(i.user.id, { username: i.user.username, puntos: 0 });
        const tabla = [...partida.jugadores.values()].map(j => `• ${j.username}`).join('\n');
        await lobbyMsg.edit({
            content: `🎵 **Adivina la canción** — pulsa **Unirse** para jugar\n\n**Jugadores (${partida.jugadores.size}):**\n${tabla}`,
        });
        await i.deferUpdate();
    });

    lobbyCollector.on('end', async () => {
        const disabledRow = new ActionRowBuilder().addComponents(ButtonBuilder.from(joinBtn).setDisabled(true));
        await lobbyMsg.edit({ components: [disabledRow] }).catch(() => {});

        if (partida.jugadores.size === 0) {
            partidasActivas.delete(guildId);
            return interaction.followUp('❌ Nadie se unió, se canceló la partida.');
        }

        await interaction.followUp(`✅ ¡Empieza la partida con ${partida.jugadores.size} jugador(es)!`);
        jugarRonda(partida);
    });
}

async function jugarRonda(partida) {
    if (!partida.activa) return;

    if (partida.rondaActual >= partida.canciones.length) {
        return finalizarPartida(partida, '🏁 Se acabaron las canciones, esa fue la última ronda.');
    }

    const cancion = partida.canciones[partida.rondaActual];
    partida.rondaActual++;

    let audioState;
    try {
        audioState = await reproducirFragmento(partida.canal, partida.textChannel, cancion);
    } catch (err) {
        console.error('[adivina] Error reproduciendo clip:', err);
        await partida.textChannel.send('⚠️ No pude reproducir esa canción, paso a la siguiente...');
        return jugarRonda(partida);
    }
    partida.audioState = audioState;

    let rondaResuelta = false;

    // Corta el audio pasada su duración, aunque nadie haya adivinado todavía
    const cortarAudio = setTimeout(() => {
        if (!rondaResuelta) audioState.queue.node.pause();
    }, cancion.duracion * 1000);

    const buzzBtn = new ButtonBuilder().setCustomId('adivina_buzz').setLabel('🔴 Buzz').setStyle(ButtonStyle.Danger);
    const buzzMsg = await partida.textChannel.send({
        content: `🎶 Ronda ${partida.rondaActual}/${partida.canciones.length} — ¡suena la canción! El primero en presionar el botón tiene el turno.`,
        components: [new ActionRowBuilder().addComponents(buzzBtn)],
    });

    const yaFallaron = new Set();
    const deadline = Date.now() + cancion.duracion * 1000 + TIEMPO_BUZZ_MS;

    async function terminarRonda(mensaje) {
        if (rondaResuelta) return;
        rondaResuelta = true;
        clearTimeout(cortarAudio);

        const disabledRow = new ActionRowBuilder().addComponents(ButtonBuilder.from(buzzBtn).setDisabled(true));
        await buzzMsg.edit({ components: [disabledRow] }).catch(() => {});
        if (mensaje) await partida.textChannel.send(mensaje);

        await detenerFragmento(audioState.queue, audioState.resumeState).catch(err => {
            console.error('[adivina] Error al detener el clip:', err);
        });

        if (partida.activa) setTimeout(() => jugarRonda(partida), 3000);
    }

    function esperarBuzz() {
        const msRestantes = deadline - Date.now();
        if (msRestantes <= 0) {
            return terminarRonda(`⌛ Nadie adivinó. Era **${cancion.respuestasValidas[0]}**.`);
        }

        const collector = buzzMsg.createMessageComponentCollector({
            filter: async i => {
                if (i.customId !== 'adivina_buzz') return false;
                if (yaFallaron.has(i.user.id)) {
                    await i.reply({ content: 'Ya fallaste esta ronda, espera la siguiente.', flags: MessageFlags.Ephemeral }).catch(() => {});
                    return false;
                }
                if (!partida.jugadores.has(i.user.id)) {
                    await i.reply({ content: 'Debes unirte a la partida (botón Unirse) antes de jugar.', flags: MessageFlags.Ephemeral }).catch(() => {});
                    return false;
                }
                return true;
            },
            max: 1,
            time: msRestantes,
        });

        collector.on('collect', async i => {
            await i.reply(`🎤 ${i.user} tiene el turno — responde en el chat (${TIEMPO_RESPUESTA_MS / 1000}s).`);

            const msParaResponder = Math.min(TIEMPO_RESPUESTA_MS, Math.max(deadline - Date.now(), 3000));
            const respuestaCollector = partida.textChannel.createMessageCollector({
                filter: m => m.author.id === i.user.id,
                max: 1,
                time: msParaResponder,
            });

            respuestaCollector.on('collect', async m => {
                if (esRespuestaCorrecta(m.content, cancion.respuestasValidas)) {
                    if (partida.jugadores.has(i.user.id)) partida.jugadores.get(i.user.id).puntos++;
                    await m.react('✅').catch(() => {});
                    await terminarRonda(`✅ ¡Correcto! Era **${cancion.respuestasValidas[0]}**. Punto para ${i.user}.`);
                } else {
                    await m.react('❌').catch(() => {});
                    yaFallaron.add(i.user.id);
                    await partida.textChannel.send('❌ Incorrecto. El buzzer se reabre...');
                    esperarBuzz();
                }
            });

            respuestaCollector.on('end', collected => {
                if (collected.size === 0) {
                    yaFallaron.add(i.user.id);
                    partida.textChannel.send('⌛ Se acabó tu tiempo para responder. El buzzer se reabre...');
                    esperarBuzz();
                }
            });
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time' && collected.size === 0) {
                terminarRonda(`⌛ Nadie adivinó. Era **${cancion.respuestasValidas[0]}**.`);
            }
        });
    }

    esperarBuzz();
}

async function finalizarPartida(partida, mensaje) {
    partida.activa = false;
    partidasActivas.delete(partida.guildId);

    if (partida.audioState) {
        await detenerFragmento(partida.audioState.queue, partida.audioState.resumeState).catch(() => {});
    }

    const ranking = [...partida.jugadores.values()]
        .sort((a, b) => b.puntos - a.puntos)
        .map((j, idx) => `${idx + 1}. ${j.username} — ${j.puntos} pts`)
        .join('\n') || '_nadie sumó puntos_';

    await partida.textChannel.send(`${mensaje}\n\n🏆 **Marcador final:**\n${ranking}`);
}

async function detenerPartida(interaction) {
    const partida = partidasActivas.get(interaction.guild.id);
    if (!partida) {
        return interaction.reply({ content: '❌ No hay partida activa.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply('🛑 Partida detenida.');
    await finalizarPartida(partida, '🛑 La partida fue detenida manualmente.');
}

async function mostrarMarcador(interaction) {
    const partida = partidasActivas.get(interaction.guild.id);
    if (!partida) {
        return interaction.reply({ content: '❌ No hay partida activa.', flags: MessageFlags.Ephemeral });
    }
    const ranking = [...partida.jugadores.values()]
        .sort((a, b) => b.puntos - a.puntos)
        .map((j, idx) => `${idx + 1}. ${j.username} — ${j.puntos} pts`)
        .join('\n') || '_nadie sumó puntos aún_';
    await interaction.reply(`🏆 **Marcador actual:**\n${ranking}`);
}