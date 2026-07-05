const { useMainPlayer, useQueue } = require('discord-player');

/**
 * Espera a que un track específico arranque de verdad en el player (playerStart)
 * antes de intentar hacer seek sobre él. Tiene un timeout de seguridad por si
 * el evento nunca llega (ej. error de stream).
 */
function esperarInicio(player, trackEsperado, timeoutMs = 8000) {
    return new Promise(resolve => {
        let resuelto = false;
        const handler = (_queue, track) => {
            if (track === trackEsperado && !resuelto) {
                resuelto = true;
                player.events.off('playerStart', handler);
                resolve();
            }
        };
        player.events.on('playerStart', handler);
        setTimeout(() => {
            if (!resuelto) {
                resuelto = true;
                player.events.off('playerStart', handler);
                resolve();
            }
        }, timeoutMs);
    });
}

/**
 * Reproduce el fragmento de una canción del juego en el canal de voz indicado.
 * - Si ya había música sonando (por /play), guarda su posición exacta para
 *   restaurarla después con detenerFragmento().
 * - Marca la queue con isGameRound = true para que events/music.js no anuncie
 *   el "Started playing" con el título real de la canción del juego.
 *
 * Devuelve { queue, resumeState } donde resumeState es null si no había
 * música previa.
 */
async function reproducirFragmento(voiceChannel, textChannel, cancion) {
    const player = useMainPlayer();
    let queue = useQueue(voiceChannel.guild.id);

    let resumeState = null;
    if (queue && queue.currentTrack && !queue.metadata?.isGameRound) {
        resumeState = {
            track: queue.currentTrack,
            positionMs: queue.node.getTimestamp()?.current?.value ?? 0,
        };
    }

    const resultado = await player.search(cancion.busqueda, { requestedBy: voiceChannel.client.user });
    if (!resultado || !resultado.tracks.length) {
        throw new Error(`No se encontró audio para la canción ${cancion.id} (búsqueda: "${cancion.busqueda}")`);
    }
    const trackJuego = resultado.tracks[0];

    if (!queue) {
        // No había ninguna cola en este servidor: se crea una nueva solo para el juego.
        const { queue: nuevaQueue } = await player.play(voiceChannel, trackJuego, {
            nodeOptions: {
                metadata: { channel: textChannel, isGameRound: true },
                selfDeaf: true,
                leaveOnEmpty: true,
                leaveOnEmptyCooldown: 5000,
                leaveOnEnd: false, // no debe irse solo mientras el juego sigue corriendo
            },
        });
        queue = nuevaQueue;
        // player.play ya arranca el track, esperamos su playerStart para poder hacer seek
        await esperarInicio(player, trackJuego);
    } else {
        queue.metadata.isGameRound = true;
        queue.insertTrack(trackJuego, 0);
        queue.node.skip(); // corta lo que sonaba (o el silencio) y pasa al clip del juego
        await esperarInicio(player, trackJuego);
    }

    if (cancion.inicio > 0) {
        queue.node.seek(cancion.inicio * 1000);
    }

    return { queue, resumeState };
}

/**
 * Corta el fragmento del juego y, si había música sonando antes, la retoma
 * exactamente en el punto donde se quedó.
 */
async function detenerFragmento(queue, resumeState) {
    if (!queue) return;
    const player = useMainPlayer();
    queue.metadata.isGameRound = false;

    if (resumeState) {
        queue.insertTrack(resumeState.track, 0);
        queue.node.skip();
        await esperarInicio(player, resumeState.track);
        if (resumeState.positionMs > 1000) {
            queue.node.seek(resumeState.positionMs);
        }
    } else if (queue.tracks.size === 0) {
        // No había música antes y no quedó nada más en cola: se termina la sesión de audio
        queue.delete();
    } else {
        queue.node.skip();
    }
}

module.exports = { reproducirFragmento, detenerFragmento };