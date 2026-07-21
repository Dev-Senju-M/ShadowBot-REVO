const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');

const CANCIONES_POR_PAGINA = 10;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Muestra la cola de canciones actual'),

    async execute(interaction) {
        const queue = interaction.client.distube.getQueue(interaction.guildId);
        if (!queue) {
            return interaction.reply({ content: '❌ No hay ninguna canción reproduciéndose.', flags: MessageFlags.Ephemeral });
        }

        const paginasTexto = [];
        for (let i = 0; i < queue.songs.length; i += CANCIONES_POR_PAGINA) {
            const trozo = queue.songs.slice(i, i + CANCIONES_POR_PAGINA);
            paginasTexto.push(
                trozo.map((cancion, idx) => `**\`${i + idx + 1}\`** - [\`${cancion.name}\`](${cancion.url})`).join('\n')
            );
        }

        const embeds = paginasTexto.map((desc, i) => {
            const embed = new EmbedBuilder()
                .setTitle(`🎶 Cola de ${interaction.guild.name} - \`[${queue.songs.length} ${queue.songs.length === 1 ? 'canción' : 'canciones'}]\``)
                .setColor('#8400ff')
                .setDescription(desc.slice(0, 2048))
                .setFooter({ text: `Página ${i + 1} / ${paginasTexto.length}` });
            if (queue.songs.length > 1) {
                embed.addFields([{ name: '💿 Canción actual', value: `**[\`${queue.songs[0].name}\`](${queue.songs[0].url})**` }]);
            }
            return embed;
        });

        if (embeds.length <= 1) {
            return interaction.reply({ embeds: [embeds[0]] });
        }

        let paginaActual = 0;
        const construirBotones = () => new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('queue_atras').setLabel('◀ Atrás').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('queue_inicio').setLabel('🏠 Inicio').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('queue_avanzar').setLabel('Avanzar ▶').setStyle(ButtonStyle.Success),
        );

        const respuesta = await interaction.reply({
            embeds: [embeds[paginaActual]],
            components: [construirBotones()],
            withResponse: true,
        });
        const mensaje = respuesta.resource?.message ?? await interaction.fetchReply();

        const collector = mensaje.createMessageComponentCollector({
            filter: (i) => i.isButton() && i.user.id === interaction.user.id,
            time: 180_000,
        });

        collector.on('collect', async (i) => {
            collector.resetTimer();
            if (i.customId === 'queue_atras') paginaActual = paginaActual === 0 ? embeds.length - 1 : paginaActual - 1;
            if (i.customId === 'queue_avanzar') paginaActual = paginaActual === embeds.length - 1 ? 0 : paginaActual + 1;
            if (i.customId === 'queue_inicio') paginaActual = 0;
            await i.update({ embeds: [embeds[paginaActual]] });
        });

        collector.on('end', () => {
            const botonesDesactivados = construirBotones().components.map(b => b.setDisabled(true));
            mensaje.edit({ components: [new ActionRowBuilder().addComponents(botonesDesactivados)] }).catch(() => {});
        });
    },
};