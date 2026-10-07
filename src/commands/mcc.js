const {
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  EmbedBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mcc')
    .setDescription('Juego: Matar, Coger, Casar')
    .addStringOption(opt =>
      opt.setName('nombre1').setDescription('Primer nombre').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('nombre2').setDescription('Segundo nombre').setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('nombre3').setDescription('Tercer nombre').setRequired(true)
    ),

  async execute(interaction) {
    const nombres = [
      interaction.options.getString('nombre1'),
      interaction.options.getString('nombre2'),
      interaction.options.getString('nombre3'),
    ];

    const acciones = ['Matar', 'Coger', 'Casar'];
    const emojis = { Matar: '💀', Coger: '🍆', Casar: '💍' };
    const resultados = {};
    let restantes = [...nombres];

    const buildButtons = (opciones, accionIndex) =>
      new ActionRowBuilder().addComponents(
        opciones.map(nombre =>
          new ButtonBuilder()
            .setCustomId(`mcc_${interaction.id}_${nombre}`)
            .setLabel(nombre)
            .setStyle(ButtonStyle.Primary)
        )
      );

    const buildEmbed = (accionIndex) =>
      new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('💘 Matar, Coger, Casar')
        .setDescription(
          `${interaction.user}, ¿a quién **${acciones[accionIndex]}ías**?\n\n` +
          nombres.map(n => `• ${n}`).join('\n')
        )
        .setFooter({ text: `Paso ${accionIndex + 1} de ${acciones.length - 1}` });

    await interaction.reply({
      embeds: [buildEmbed(0)],
      components: [buildButtons(restantes, 0)],
    });

    let accionIndex = 0;

    const collector = interaction.channel.createMessageComponentCollector({
      filter: i =>
        i.customId.startsWith(`mcc_${interaction.id}_`) &&
        i.user.id === interaction.user.id,
      time: 60_000,
    });

    collector.on('collect', async i => {
      const elegido = i.customId.replace(`mcc_${interaction.id}_`, '');
      const accion = acciones[accionIndex];
      resultados[accion] = elegido;
      restantes = restantes.filter(n => n !== elegido);
      accionIndex++;

      // Si quedan exactamente 2 acciones procesadas, la tercera es automática
      if (accionIndex === 2) {
        resultados[acciones[2]] = restantes[0];
        collector.stop('done');

        const finalEmbed = new EmbedBuilder()
          .setColor(0x57f287)
          .setTitle('💘 Resultados: Matar, Coger, Casar')
          .setDescription(
            acciones
              .map(a => `${emojis[a]} **${a}** → ${resultados[a]}`)
              .join('\n')
          )
          .setFooter({ text: `Jugado por ${interaction.user.tag}` });

        await i.update({ embeds: [finalEmbed], components: [] });
        return;
      }

      // Siguiente pregunta
      const nextEmbed = buildEmbed(accionIndex);
      const nextRow = buildButtons(restantes, accionIndex);
      await i.update({ embeds: [nextEmbed], components: [nextRow] });
    });

    collector.on('end', async (_, reason) => {
      if (reason !== 'done') {
        await interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xed4245)
              .setDescription('⏰ Se acabó el tiempo. Comando cancelado.'),
          ],
          components: [],
        });
      }
    });
  },
};
