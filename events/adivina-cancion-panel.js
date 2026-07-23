const {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    MessageFlags,
    PermissionFlagsBits,
} = require('discord.js');
const {
    getGame,
    unirParticipante,
    sumarPuntos,
    eliminarGame,
    buildLobbyEmbed,
    buildBuzzerEmbed,
    nombreCancion,
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

function buildHolderRow() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('acc_correcto').setLabel('✅ Acertó').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('aci_incorrecto').setLabel('❌ Falló').setStyle(ButtonStyle.Danger)
    );
}

module.exports = (client) => {
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('ac')) return;

        const guildId = interaction.guildId;
        const game = getGame(guildId);

        try {
            if (interaction.customId === 'acj_unirse') return handleUnirse(interaction, game);
            if (interaction.customId === 'acp_pedir') return handlePedir(interaction, game);
            if (interaction.customId === 'acc_correcto') return handleResultado(interaction, game, true);
            if (interaction.customId === 'aci_incorrecto') return handleResultado(interaction, game, false);
        } catch (error) {
            console.error('[adivina-cancion] error en botón:', error);
            const payload = { content: '❌ Ocurrió un error procesando la acción.', flags: MessageFlags.Ephemeral };
            if (interaction.deferred || interaction.replied) {
                await interaction.followUp(payload).catch(() => {});
            } else {
                await interaction.reply(payload).catch(() => {});
            }
        }
    });
};

async function handleUnirse(interaction, game) {
    if (!game || game.state === 'ended') {
        return interaction.reply({ content: '❌ No hay ninguna partida activa.', flags: MessageFlags.Ephemeral });
    }
    const nuevo = unirParticipante(game, interaction.user);
    if (!nuevo) {
        return interaction.reply({ content: '✅ Ya estás en la partida.', flags: MessageFlags.Ephemeral });
    }
    await interaction.update({ embeds: [buildLobbyEmbed(game)], components: [buildJoinRow()] });
}

async function handlePedir(interaction, game) {
    if (!game || game.state === 'ended') {
        return interaction.reply({ content: '❌ No hay ninguna partida activa.', flags: MessageFlags.Ephemeral });
    }
    if (game.state !== 'round_buzzer') {
        return interaction.reply({ content: '⚠️ No es momento de pedir la palabra todavía.', flags: MessageFlags.Ephemeral });
    }
    if (!game.participants.has(interaction.user.id)) {
        return interaction.reply({ content: '❌ Debes unirte a la partida primero con el botón 🎤 Unirme del mensaje inicial.', flags: MessageFlags.Ephemeral });
    }
    if (game.failedThisRound.has(interaction.user.id)) {
        return interaction.reply({ content: '❌ Ya fallaste esta ronda, espera a la siguiente.', flags: MessageFlags.Ephemeral });
    }
    if (game.currentHolder) {
        return interaction.reply({ content: '⚠️ Alguien ya tiene la palabra, espera tu turno.', flags: MessageFlags.Ephemeral });
    }

    game.currentHolder = interaction.user.id;
    game.state = 'round_answering';

    await interaction.update({
        embeds: [buildBuzzerEmbed(game, { holder: interaction.user.id })],
        components: [buildHolderRow()],
    });
}

async function handleResultado(interaction, game, acerto) {
    if (!esModerador(interaction.member)) {
        return interaction.reply({ content: '❌ Solo un moderador puede marcar el resultado.', flags: MessageFlags.Ephemeral });
    }
    if (!game || game.state !== 'round_answering' || !game.currentHolder) {
        return interaction.reply({ content: '⚠️ No hay ninguna respuesta pendiente de calificar.', flags: MessageFlags.Ephemeral });
    }

    const holderId = game.currentHolder;

    if (acerto) {
        const participante = sumarPuntos(game, holderId, game.currentPoints);
        const nombre = nombreCancion(game.currentSong);
        game.currentHolder = null;
        game.currentSong = null;
        game.failedThisRound = new Set();
        game.state = 'lobby';

        await interaction.update({
            embeds: [],
            content:
                `✅ ¡Correcto! La canción era **${nombre}**.\n` +
                `<@${holderId}> ganó **+${game.currentPoints} puntos** ` +
                `(total: **${participante?.score ?? game.currentPoints}**).\n\n` +
                'El moderador puede usar `/adivina-cancion jugar` para la siguiente ronda.',
            components: [],
        });
        return;
    }

    // Falló
    game.failedThisRound.add(holderId);
    game.currentHolder = null;

    const todosFallaron = game.participants.size > 0 &&
        [...game.participants.keys()].every(id => game.failedThisRound.has(id));

    if (todosFallaron) {
        game.state = 'round_buzzer';
        await interaction.update({
            embeds: [buildBuzzerEmbed(game)],
            components: [buildBuzzerRow(true)],
            content: '😢 Todos los participantes fallaron esta ronda. El moderador puede usar `/adivina-cancion revelar` para mostrar la respuesta y continuar.',
        });
        return;
    }

    game.state = 'round_buzzer';
    await interaction.update({
        content: null,
        embeds: [buildBuzzerEmbed(game)],
        components: [buildBuzzerRow()],
    });
}