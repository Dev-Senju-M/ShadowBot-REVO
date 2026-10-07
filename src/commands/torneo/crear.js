const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const T = require('../../utils/torneos');
const { errorEmbed, embedTorneoCreado } = require('../../utils/torneo-embeds');

module.exports = async (interaction) => {
    const guildId = interaction.guildId;

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
};
