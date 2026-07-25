const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
} = require('discord.js');
const {
    getGame,
    crearGame,
    eliminarGame,
    duracionClip,
    buildLobbyEmbed,
    buildBuzzerEmbed,
    buildScoreboardEmbed,
    nombreCancion,
    PUNTOS_POR_DEFECTO,
    MIN_DURACION,
    MAX_DURACION,
} = require('../utils/song-game');

function esModerador(member) {
    return member.permissions.has(PermissionFlagsBits.ManageMessages) ||
        member.permissions.has(PermissionFlagsBits.Administrator);
}

function buildJoinRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('acj_unirse').setLabel('🎤 Unirme').setStyle(ButtonStyle.Success)
    );
}

function buildBuzzerRow(disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('acp_pedir').setLabel('🙋 Pedir la palabra').setStyle(ButtonStyle.Primary).setDisabled(disabled)
    );
}

function esperarPlaySong(distube, guildId, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            distube.off('playSong', handler);
            reject(new Error('Se agotó el tiempo esperando que iniciara la canción.'));
        }, timeoutMs);
        function handler(queue, song) {
            if (queue.id !== guildId) return;
            clearTimeout(timer);
            distube.off('playSong', handler);
            resolve({ queue, song });
        }
        distube.on('playSong', handler);
    });
}

// Espera a que el AudioPlayer de @discordjs/voice llegue realmente al estado
// "playing" (no solo que DisTube haya iniciado el proceso). Esto es lo que
// marca el momento exacto en que el audio empieza a ser audible en el canal,
// que es varios segundos más tarde que el evento "playSong" de DisTube.
function esperarAudioAudible(queue, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
        const audioPlayer = queue?.voice?.audioPlayer;
        if (!audioPlayer) return resolve(); // fallback de seguridad si no está disponible

        if (audioPlayer.state.status === 'playing') return resolve();

        const timer = setTimeout(() => {
            audioPlayer.off('stateChange', handler);
            reject(new Error('Tiempo de espera agotado esperando que el audio empezara a sonar.'));
        }, timeoutMs);

        function handler(_oldState, newState) {
            if (newState.status === 'playing') {
                clearTimeout(timer);
                audioPlayer.off('stateChange', handler);
                resolve();
            }
        }
        audioPlayer.on('stateChange', handler);
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adivina-cancion')
        .setDescription('Juego: Adivina la Canción')
        .addSubcommand(sub =>
            sub.setName('iniciar').setDescription('Abre una nueva partida para que los participantes se unan'))
        .addSubcommand(sub =>
            sub.setName('jugar')
                .setDescription('(Moderador) Reproduce el fragmento de una canción elegida por ti')
                .addStringOption(opt =>
                    opt.setName('cancion')
                        .setDescription('Nombre o link (YouTube/Spotify/SoundCloud) de la canción a reproducir')
                        .setRequired(true))
                .addIntegerOption(opt =>
                    opt.setName('inicio')
                        .setDescription('Segundo del video/canción donde empieza el fragmento (por defecto 0)')
                        .setMinValue(0))
                .addIntegerOption(opt =>
                    opt.setName('duracion')
                        .setDescription(`Duración del fragmento en segundos (entre ${MIN_DURACION} y ${MAX_DURACION}, por defecto 8)`)
                        .setMinValue(MIN_DURACION)
                        .setMaxValue(MAX_DURACION))
                .addIntegerOption(opt =>
                    opt.setName('puntos')
                        .setDescription('Puntos que valdrá acertar esta ronda (por defecto 10)')
                        .setMinValue(1)
                        .setMaxValue(100)))
        .addSubcommand(sub =>
            sub.setName('revelar').setDescription('(Moderador) Revela la respuesta y salta la ronda actual sin dar puntos'))
        .addSubcommand(sub =>
            sub.setName('marcador').setDescription('Muestra el marcador actual de la partida'))
        .addSubcommand(sub =>
            sub.setName('finalizar').setDescription('(Moderador) Termina la partida y muestra el marcador final')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        if (sub === 'iniciar') return iniciar(interaction, guildId);
        if (sub === 'jugar') return jugar(interaction, guildId);
        if (sub === 'revelar') return revelar(interaction, guildId);
        if (sub === 'marcador') return marcador(interaction, guildId);
        if (sub === 'finalizar') return finalizar(interaction, guildId);
    },

    esModerador,
    buildBuzzerRow,
};

async function iniciar(interaction, guildId) {
    const existente = getGame(guildId);
    if (existente && existente.state !== 'ended') {
        return interaction.reply({
            content: '⚠️ Ya hay una partida activa en este servidor. Usa `/adivina-cancion finalizar` antes de iniciar otra.',
            flags: MessageFlags.Ephemeral,
        });
    }

    const game = crearGame(guildId, interaction.channelId, interaction.user.id);
    await interaction.reply({
        embeds: [buildLobbyEmbed(game)],
        components: [buildJoinRow()],
    });
}

async function jugar(interaction, guildId) {
    if (!esModerador(interaction.member)) {
        return interaction.reply({ content: '❌ Solo un moderador puede iniciar una ronda.', flags: MessageFlags.Ephemeral });
    }

    const game = getGame(guildId);
    if (!game || game.state === 'ended') {
        return interaction.reply({ content: '❌ No hay ninguna partida activa. Usa `/adivina-cancion iniciar` primero.', flags: MessageFlags.Ephemeral });
    }
    if (game.state === 'round_buzzer' || game.state === 'round_answering') {
        return interaction.reply({ content: '⚠️ Ya hay una ronda en curso. Resuélvela (✅/❌) o usa `/adivina-cancion revelar` antes de continuar.', flags: MessageFlags.Ephemeral });
    }
    if (game.state === 'round_playing') {
        return interaction.reply({ content: '⚠️ La canción ya está sonando, espera a que termine.', flags: MessageFlags.Ephemeral });
    }
    if (game.participants.size === 0) {
        return interaction.reply({ content: '❌ Nadie se ha unido todavía. Espera a que se unan participantes con el botón 🎤 Unirme.', flags: MessageFlags.Ephemeral });
    }

    const canalVoz = interaction.member.voice.channel;
    if (!canalVoz) {
        return interaction.reply({ content: '❌ Debes estar en un canal de voz para reproducir la canción.', flags: MessageFlags.Ephemeral });
    }
    const permisos = canalVoz.permissionsFor(interaction.guild.members.me);
    if (!permisos.has(['Connect', 'Speak'])) {
        return interaction.reply({ content: '❌ No tengo permisos para conectarme o hablar en ese canal de voz.', flags: MessageFlags.Ephemeral });
    }

    const query = interaction.options.getString('cancion');
    const inicio = interaction.options.getInteger('inicio') ?? 0;
    const duracionPedida = interaction.options.getInteger('duracion') ?? 8;
    const puntos = interaction.options.getInteger('puntos') ?? PUNTOS_POR_DEFECTO;

    game.voiceChannelId = canalVoz.id;
    game.roundNumber += 1;
    game.currentSong = { query, inicio, duracionPedida, titulo: null, roundId: game.roundNumber };
    game.currentPoints = puntos;
    game.currentHolder = null;
    game.failedThisRound = new Set();
    game.state = 'round_playing';
    if (game.roundTimer) {
        clearTimeout(game.roundTimer);
        game.roundTimer = null;
    }

    await interaction.reply(`🔎 Buscando \`${query}\` para la ronda ${game.roundNumber}...`);

    const rondaId = game.roundNumber;

    try {
        const distube = interaction.client.distube;
        const esperaCancion = esperarPlaySong(distube, guildId);
        await distube.play(canalVoz, query, { member: interaction.member });
        const { queue, song } = await esperaCancion;

        // Si el moderador ya canceló/cambió la ronda mientras se resolvía la búsqueda, no seguir.
        if (game.currentSong?.roundId !== rondaId || game.state !== 'round_playing') return;

        game.currentSong.titulo = song?.name ?? query;

        if (inicio > 0) {
            // Al saltar de posición, DisTube reinicia el proceso de audio (ffmpeg),
            // así que hay que volver a esperar a que el sonido sea audible de verdad.
            const esperaAudibleTrasSalto = esperarAudioAudible(queue);
            await queue.seek(inicio);
            await esperaAudibleTrasSalto.catch(err => console.warn('[adivina-cancion]', err.message));
        } else {
            // Incluso reproduciendo desde el inicio, hay que esperar a que termine el buffering.
            await esperarAudioAudible(queue).catch(err => console.warn('[adivina-cancion]', err.message));
        }

        // Si mientras se esperaba el audio la ronda fue cancelada (revelar/finalizar), no seguir.
        if (game.currentSong?.roundId !== rondaId || game.state !== 'round_playing') return;

        await interaction.editReply(`🎶 ¡Sonando la ronda ${game.roundNumber}! Escuchen con atención...`);

        // El cronómetro del fragmento arranca AHORA, justo cuando el audio ya es audible.
        const durMs = duracionClip(duracionPedida) * 1000;
        game.roundTimer = setTimeout(async () => {
            try {
                if (game.currentSong?.roundId !== rondaId || game.state !== 'round_playing') return;
                await queue.stop().catch(() => {});
                game.state = 'round_buzzer';
                await interaction.channel.send({
                    embeds: [buildBuzzerEmbed(game)],
                    components: [buildBuzzerRow()],
                }).catch(() => {});
            } catch (e) {
                console.error('[adivina-cancion] error al finalizar el clip:', e);
            }
        }, durMs);
    } catch (error) {
        console.error('[adivina-cancion] error al reproducir:', error);
        if (game.currentSong?.roundId === rondaId) {
            game.state = 'lobby';
            game.currentSong = null;
        }
        await interaction.editReply('❌ No pude reproducir esa canción. Prueba con otro nombre/link usando `/adivina-cancion jugar`.').catch(() => {});
    }
}

async function revelar(interaction, guildId) {
    if (!esModerador(interaction.member)) {
        return interaction.reply({ content: '❌ Solo un moderador puede revelar la respuesta.', flags: MessageFlags.Ephemeral });
    }

    const game = getGame(guildId);
    if (!game || !game.currentSong || game.state === 'lobby' || game.state === 'ended') {
        return interaction.reply({ content: '❌ No hay ninguna ronda activa para revelar.', flags: MessageFlags.Ephemeral });
    }

    const nombre = nombreCancion(game.currentSong);
    game.state = 'lobby';
    game.currentSong = null;
    game.currentHolder = null;
    game.failedThisRound = new Set();
    if (game.roundTimer) {
        clearTimeout(game.roundTimer);
        game.roundTimer = null;
    }

    const distube = interaction.client.distube;
    const queue = distube.getQueue(guildId);
    if (queue) await queue.stop().catch(() => {});

    await interaction.reply(`📢 La canción era: **${nombre}**. Nadie ganó puntos esta ronda. Usa \`/adivina-cancion jugar\` para continuar.`);
}

async function marcador(interaction, guildId) {
    const game = getGame(guildId);
    if (!game) {
        return interaction.reply({ content: '❌ No hay ninguna partida activa en este servidor.', flags: MessageFlags.Ephemeral });
    }
    await interaction.reply({ embeds: [buildScoreboardEmbed(game)] });
}

async function finalizar(interaction, guildId) {
    if (!esModerador(interaction.member)) {
        return interaction.reply({ content: '❌ Solo un moderador puede finalizar la partida.', flags: MessageFlags.Ephemeral });
    }

    const game = getGame(guildId);
    if (!game) {
        return interaction.reply({ content: '❌ No hay ninguna partida activa en este servidor.', flags: MessageFlags.Ephemeral });
    }

    game.state = 'ended';
    const distube = interaction.client.distube;
    const queue = distube.getQueue(guildId);
    if (queue) await queue.stop().catch(() => {});
    else distube.voices.leave(guildId);

    const embed = buildScoreboardEmbed(game, { titulo: '🏁 Partida finalizada — Marcador final' });
    eliminarGame(guildId);
    await interaction.reply({ embeds: [embed] });
}