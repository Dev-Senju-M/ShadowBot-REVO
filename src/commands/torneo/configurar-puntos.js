const { EmbedBuilder, MessageFlags } = require('discord.js');
const T = require('../../utils/torneos');
const { COLOR_OK, errorEmbed } = require('../../utils/torneo-embeds');

module.exports = async (interaction, torneo) => {
    if (!T.esOrganizador(interaction, torneo)) {
        return interaction.reply({ embeds: [errorEmbed('Solo el organizador o un admin puede configurar la puntuación.')], flags: MessageFlags.Ephemeral });
    }
    if (torneo.formato !== 'puntos') {
        return interaction.reply({ embeds: [errorEmbed('Este torneo no usa formato de puntos.')], flags: MessageFlags.Ephemeral });
    }

    const porKill = interaction.options.getInteger('por_kill');
    const tablaTxt = interaction.options.getString('tabla_posiciones');
    const porPosicion = {};
    for (const par of tablaTxt.split(',')) {
        const [pos, pts] = par.split('=').map(s => s.trim());
        if (!pos || pts === undefined || isNaN(Number(pos)) || isNaN(Number(pts))) {
            return interaction.reply({ embeds: [errorEmbed('Formato inválido en `tabla_posiciones`. Usa algo como `1=10,2=6,3=5`.')], flags: MessageFlags.Ephemeral });
        }
        porPosicion[pos] = Number(pts);
    }

    torneo.puntosConfig = { porKill, porPosicion };
    T.guardarTorneo(interaction.guildId, torneo);

    return interaction.reply({ embeds: [new EmbedBuilder().setColor(COLOR_OK).setTitle('✅ Puntuación actualizada')
            .setDescription(`${porKill} pt(s) por kill\nPosición: ${Object.entries(porPosicion).map(([k, v]) => `#${k}=${v}`).join(', ')}`)] });
};
