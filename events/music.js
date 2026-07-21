const { DisTube, isVoiceChannelEmpty } = require('distube');
const { YtDlpPlugin } = require('@distube/yt-dlp');
const { SpotifyPlugin } = require('@distube/spotify');
const { SoundCloudPlugin } = require('@distube/soundcloud');
const { EmbedBuilder } = require('discord.js');

module.exports = (client) => {
    client.distube = new DisTube(client, {
        emitNewSongOnly: false,
        savePreviousSongs: true,
        emitAddSongWhenCreatingQueue: false,
        plugins: [
            new YtDlpPlugin(),
            new SpotifyPlugin(),
            new SoundCloudPlugin(),
        ],
    });

    client.distube.on('playSong', (queue, song) => {
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