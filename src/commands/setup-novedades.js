const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const store = require('../utils/db');
const N = require('../utils/novedades');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-novedades')
    .setDescription('Configura el canal donde el bot anuncia sus novedades (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('canal').setDescription('Canal (y rol opcional a mencionar) para las novedades')
      .addChannelOption(o => o.setName('canal').setDescription('Canal de novedades').setRequired(true)
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
      .addRoleOption(o => o.setName('rol').setDescription('Rol a mencionar en cada anuncio (opcional)')))
    .addSubcommand(sub => sub.setName('vista-previa').setDescription('Muestra solo a ti cómo se verá el anuncio de la versión más nueva'))
    .addSubcommand(sub => sub.setName('publicar').setDescription('Publica ya la versión más nueva de NOVEDADES.md')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const efimero = { flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } };

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      const rol = interaction.options.getRole('rol');
      if (rol && rol.id === interaction.guild.id) {
        return interaction.reply({ content: '❌ Elige un rol específico, no @everyone.', ...efimero });
      }
      const config = store.get('config');
      config.novedadesChannel = canal.id;
      config.novedadesRole = rol?.id ?? null;
      store.set('config', config);
      const auto = process.env.ANUNCIAR_NOVEDADES === 'true';
      return interaction.reply({
        content: `✅ Las novedades se publicarán en ${canal}${rol ? ` mencionando a ${rol}` : ''}.`
          + (auto ? '' : '\nℹ️ El anuncio automático está apagado en este entorno (`ANUNCIAR_NOVEDADES`). Puedes publicar a mano con `/setup-novedades publicar`.'),
        ...efimero,
      });
    }

    const [ultima] = N.leerVersiones();
    if (!ultima) return interaction.reply({ content: '❌ No hay versiones en NOVEDADES.md.', ...efimero });

    if (sub === 'vista-previa') {
      const [primero, ...resto] = N.mensajesDeVersion(ultima);
      await interaction.reply({ ...primero, content: `👀 Vista previa de la v${ultima.version} (solo tú la ves):`, ...efimero });
      for (const mensaje of resto) await interaction.followUp({ ...mensaje, ...efimero });
      return;
    }

    // publicar
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await N.publicar(interaction.client, [ultima]);
      return await interaction.editReply(`✅ Publicada la v${ultima.version}.`);
    } catch (err) {
      return interaction.editReply(`❌ ${err.message}`);
    }
  },
};
