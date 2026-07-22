const { DisTube, isVoiceChannelEmpty } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { EmbedBuilder } = require('discord.js');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');

module.exports = (client) => {
    try {
        const stat = fs.statSync(ffmpegPath);
        console.log(`[ffmpeg check] path=${ffmpegPath} size=${stat.size} mode=${stat.mode.toString(8)}`);
        fs.accessSync(ffmpegPath, fs.constants.X_OK);
        console.log('[ffmpeg check] binary is executable ✅');
    } catch (e) {
        console.error('[ffmpeg check] PROBLEM with ffmpeg binary:', e.message);
    }

    client.distube = new DisTube(client, {
        emitNewSongOnly: false,
        savePreviousSongs: true,
        emitAddSongWhenCreatingQueue: false,
        ffmpeg: {
            path: ffmpegPath,
            args: {
                input: {
                    headers: 'Referer: https://www.youtube.com/\r\nUser-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
                },
            },
        },
        plugins: [
            new SpotifyPlugin(),
            new SoundCloudPlugin(),
            new YtDlpPlugin(),
        ],
    });

    client.distube.on('playSong', (queue, song) => {
        try {
            const { getVoiceConnection } = require('@discordjs/voice');
            const conn = getVoiceConnection(queue.id, client.user?.id) ?? getVoiceConnection(queue.id);
            if (conn) {
                console.log(`[voice] current status at playSong: ${conn.state.status}`);
                conn.on('stateChange', (oldS, newS) => {
                    console.log(`[voice] ${oldS.status} -> ${newS.status}`);
                });
            } else {
                console.log('[voice] no getVoiceConnection found for guild', queue.id);
            }
            const player = conn?.state?.subscription?.player;
            if (player) {
                console.log(`[voice] audio player state: ${player.state.status}`);
                player.on('stateChange', (oldS, newS) => {
                    console.log(`[voice] player ${oldS.status} -> ${newS.status}`);
                });
                player.on('error', (err) => {
                    console.error('[voice] AudioPlayer error:', err);
                });
            }
        } catch (e) {
            console.error('[voice debug] failed to attach listeners:', e);
        }
        queue.textChannel?.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`🎶 Reproduciendo \`${song.name}\` - \`${song.formattedDuration}\``)
                    .setThumbnail(song.thumbnail)
                    .setURL(song.url)
                    .setColor('#8400ff')
                    .setFooter({ text: `Añadida por ${song.user.tag}`, iconURL: song.user.displayAvatarURL({ dynamic: true }) }),
            ],
        }).catch(() => {});
    });

    client.distube.on('addSong', (queue, song) => {
        queue.textChannel?.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`✅ Añadido \`${song.name}\` - \`${song.formattedDuration}\``)
                    .setThumbnail(song.thumbnail)
                    .setURL(song.url)
                    .setColor('#8400ff')
                    .setFooter({ text: `Añadida por ${song.user.tag}`, iconURL: song.user.displayAvatarURL({ dynamic: true }) }),
            ],
        }).catch(() => {});
    });

    client.distube.on('finish', (queue) => {
        queue.textChannel?.send('🏁 **La cola de canciones ha terminado!**').catch(() => {});
        queue.voice?.leave();
    });

    client.distube.on('debug', (message) => {
        console.log('[DisTube debug]', message);
    });

    client.distube.on('error', (context, error) => {
        console.error('[DisTube error]', error);
        const canal = context?.textChannel ?? context;
        canal?.send?.(`❌ **Ocurrió un error al reproducir:** ${error.message?.slice(0, 200) ?? 'Error desconocido'}`).catch(() => {});
    });

    client.on('voiceStateUpdate', (oldState) => {
        if (!oldState?.channel) return;
        const voice = client.distube.voices.get(oldState);
        if (voice && isVoiceChannelEmpty(oldState)) {
            voice.leave();
        }
    });

    console.log('🎶 Módulo de música (DisTube) cargado!');
};