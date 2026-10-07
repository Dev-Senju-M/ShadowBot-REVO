const { MessageFlags } = require('discord.js');
const T = require('../../utils/torneos');
const { errorEmbed, embedLlaves, embedTabla } = require('../../utils/torneo-embeds');

module.exports = async (interaction, torneo) => {
    const guildId = interaction.guildId;

    if (!T.esOrganizador(interaction, torneo)) {
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
};
