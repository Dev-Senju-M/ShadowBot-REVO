const { EmbedBuilder, MessageFlags } = require('discord.js');
const T = require('../../utils/torneos');
const { COLOR_ERR, errorEmbed } = require('../../utils/torneo-embeds');

module.exports = async (interaction, torneo) => {
    if (!T.esOrganizador(interaction, torneo)) {
        return interaction.reply({ embeds: [errorEmbed('Solo el organizador o un admin puede cancelar el torneo.')], flags: MessageFlags.Ephemeral });
    }
    torneo.estado = 'cancelado';
    T.guardarTorneo(interaction.guildId, torneo);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLOR_ERR).setDescription(`🚫 Torneo **${torneo.nombre}** cancelado.`)] });
};
