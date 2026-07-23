const { EmbedBuilder } = require('discord.js');

// Duración del clip: se fuerza a estar siempre entre estos límites (segundos)
const MIN_DURACION = 5;
const MAX_DURACION = 10;
const PUNTOS_POR_DEFECTO = 10;

/** @type {Map<string, GameState>} guildId -> estado de la partida */
const games = new Map();

function duracionClip(segundosPedidos) {
    const d = Number(segundosPedidos) || MAX_DURACION;
    return Math.min(Math.max(d, MIN_DURACION), MAX_DURACION);
}

function nombreCancion(cancion) {
    return cancion?.titulo || cancion?.query || 'la canción';
}

function getGame(guildId) {
    return games.get(guildId) ?? null;
}

function crearGame(guildId, textChannelId, hostId) {
    const game = {
        guildId,
        textChannelId,
        voiceChannelId: null,
        hostId,
        state: 'lobby', // lobby -> round_playing -> round_buzzer -> round_answering -> lobby ... -> ended
        participants: new Map(), // userId -> { id, tag, score }
        currentSong: null, // { query, inicio, duracionPedida, titulo }
        currentPoints: PUNTOS_POR_DEFECTO,
        currentHolder: null,
        failedThisRound: new Set(),
        roundTimer: null,
        roundNumber: 0,
        createdAt: Date.now(),
    };
    games.set(guildId, game);
    return game;
}

function eliminarGame(guildId) {
    const game = games.get(guildId);
    if (game?.roundTimer) clearTimeout(game.roundTimer);
    games.delete(guildId);
}

function unirParticipante(game, user) {
    if (game.participants.has(user.id)) return false;
    game.participants.set(user.id, { id: user.id, tag: user.tag ?? user.username, score: 0 });
    return true;
}

function sumarPuntos(game, userId, puntos) {
    const p = game.participants.get(userId);
    if (!p) return null;
    p.score += puntos;
    return p;
}

function buildLobbyEmbed(game) {
    const lista = [...game.participants.values()]
        .map(p => `• <@${p.id}>`)
        .join('\n') || '_Nadie se ha unido todavía._';

    return new EmbedBuilder()
        .setColor('#8400ff')
        .setTitle('🎶 Adivina la Canción')
        .setDescription(
            '¡Prepárense! Únanse al juego y conéctense al canal de voz.\n\n' +
            'El moderador elegirá la canción con `/adivina-cancion jugar` (puede ser un link o el nombre de la canción). ' +
            'Sonará un fragmento y, al terminar, pulsen **🙋 Pedir la palabra** para intentar adivinarla cantando, tarareando o diciendo el nombre por voz.'
        )
        .addFields({ name: `🎤 Participantes (${game.participants.size})`, value: lista })
        .setFooter({ text: 'Presiona el botón para unirte' });
}

function buildBuzzerEmbed(game, { holder = null } = {}) {
    const fallaron = [...game.failedThisRound].map(id => `<@${id}>`).join(', ') || 'Nadie';
    const embed = new EmbedBuilder()
        .setColor(holder ? '#f1c40f' : '#8400ff')
        .setTitle('🎧 ¿Qué canción sonó?')
        .setFooter({ text: `Ronda ${game.roundNumber}` });

    if (holder) {
        embed.setDescription(`🎙️ <@${holder}> tiene la palabra y está respondiendo por voz.\n\nEl moderador debe marcar si acertó o falló.`);
    } else {
        embed.setDescription('Pulsen **🙋 Pedir la palabra** para intentar adivinar cantando, tarareando o diciendo el nombre por voz.');
    }

    embed.addFields({ name: '❌ Ya fallaron esta ronda', value: fallaron });
    return embed;
}

function buildScoreboardEmbed(game, { titulo = '🏆 Marcador' } = {}) {
    const ranking = [...game.participants.values()].sort((a, b) => b.score - a.score);
    const lista = ranking.length
        ? ranking.map((p, i) => `${medalla(i)} <@${p.id}> — **${p.score}** pts`).join('\n')
        : '_Todavía no hay participantes._';

    return new EmbedBuilder()
        .setColor('#8400ff')
        .setTitle(titulo)
        .setDescription(lista);
}

function medalla(i) {
    return ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
}

module.exports = {
    MIN_DURACION,
    MAX_DURACION,
    PUNTOS_POR_DEFECTO,
    games,
    duracionClip,
    nombreCancion,
    getGame,
    crearGame,
    eliminarGame,
    unirParticipante,
    sumarPuntos,
    buildLobbyEmbed,
    buildBuzzerEmbed,
    buildScoreboardEmbed,
};