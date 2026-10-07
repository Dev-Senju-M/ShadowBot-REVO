const { embedLlaves, embedTabla } = require('../../utils/torneo-embeds');

module.exports = async (interaction, torneo) => {
    const embed = torneo.formato === 'eliminacion' ? embedLlaves(torneo) : embedTabla(torneo);
    return interaction.reply({ embeds: [embed] });
};
