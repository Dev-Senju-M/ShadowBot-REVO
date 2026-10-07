const { embedLista } = require('../../utils/torneo-embeds');

module.exports = async (interaction, torneo) => {
    return interaction.reply({ embeds: [embedLista(torneo)] });
};
