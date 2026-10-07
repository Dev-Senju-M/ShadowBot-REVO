const { SlashCommandBuilder, MessageFlags, OverwriteType } = require('discord.js');
const G = require('../utils/grupos');
const { humanos, mensajeError } = require('../utils/salas');

const ESPERA_RENOMBRAR_MS = 5000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('sala')
    .setDescription('Controla tu sala de voz temporal')
    .addSubcommand(sub => sub.setName('nombre').setDescription('Cambia el nombre de tu sala')
      .addStringOption(o => o.setName('texto').setDescription('Nuevo nombre').setRequired(true).setMaxLength(100)))
    .addSubcommand(sub => sub.setName('limite').setDescription('Pone un límite de personas (0 = sin límite)')
      .addIntegerOption(o => o.setName('numero').setDescription('Máximo de personas').setRequired(true).setMinValue(0).setMaxValue(99)))
    .addSubcommand(sub => sub.setName('bloquear').setDescription('Nadie más puede entrar; quienes están dentro se quedan'))
    .addSubcommand(sub => sub.setName('desbloquear').setDescription('Vuelve a abrir tu sala')),

  async execute(interaction) {
    const canal = interaction.member.voice?.channel;
    const sala = canal && G.getGuild(interaction.guildId).salas[canal.id];
    if (!sala) {
      return interaction.reply({ content: '❌ Tienes que estar dentro de una sala temporal.', flags: MessageFlags.Ephemeral });
    }
    if (sala.ownerId !== interaction.user.id) {
      return interaction.reply({ content: `❌ Solo el dueño de la sala (<@${sala.ownerId}>) puede usar esto.`, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const sub = interaction.options.getSubcommand();
    try {
      if (sub === 'nombre') {
        const texto = interaction.options.getString('texto');
        // Discord permite 2 renombres cada 10 min por canal; con el límite, discord.js espera en silencio
        const peticion = canal.setName(texto);
        peticion.catch(err => console.error('[sala] Error al renombrar:', err.message));
        const renombrado = await Promise.race([
          peticion.then(() => true),
          new Promise(resolve => setTimeout(() => resolve(false), ESPERA_RENOMBRAR_MS)),
        ]);
        return await interaction.editReply(renombrado
          ? `✅ Sala renombrada a **${texto}**.`
          : '⏳ Discord solo permite 2 cambios de nombre cada 10 minutos por canal. El cambio se aplicará en cuanto lo permita.');
      }

      if (sub === 'limite') {
        const numero = interaction.options.getInteger('numero');
        await canal.setUserLimit(numero);
        return await interaction.editReply(numero ? `✅ Límite: **${numero}** personas.` : '✅ Sin límite de personas.');
      }

      if (sub === 'bloquear') {
        await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: false });
        const permitidos = new Set([sala.ownerId, ...humanos(canal).keys()]);
        for (const id of permitidos) {
          await canal.permissionOverwrites.edit(id, { Connect: true }, { type: OverwriteType.Member });
        }
        return await interaction.editReply('🔒 Sala bloqueada. Quienes están dentro pueden volver a entrar si se desconectan.');
      }

      // desbloquear
      await canal.permissionOverwrites.edit(interaction.guild.roles.everyone, { Connect: null });
      for (const overwrite of [...canal.permissionOverwrites.cache.values()]) {
        if (overwrite.type === OverwriteType.Member) await overwrite.delete();
      }
      return await interaction.editReply('🔓 Sala desbloqueada.');
    } catch (err) {
      console.error('[sala]', err.message);
      return interaction.editReply(`❌ No se pudo aplicar: ${mensajeError(err)}`);
    }
  },
};
