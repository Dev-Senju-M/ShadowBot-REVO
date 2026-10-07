const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } = require('discord.js');
const G = require('../utils/grupos');
const { mensajeError } = require('../utils/salas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-grupos')
    .setDescription('Configura buscar grupo y las salas de voz temporales (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub => sub.setName('canal').setDescription('Canal donde se publican los anuncios de /buscar-grupo')
      .addChannelOption(o => o.setName('canal').setDescription('Canal de anuncios').addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(sub => sub.setName('salas').setDescription('Crea la categoría "🎮 Salas" con el canal "➕ Crear sala"'))
    .addSubcommand(sub => sub.setName('juego-agregar').setDescription('Agrega un juego (o cambia su rol)')
      .addStringOption(o => o.setName('nombre').setDescription('Nombre del juego (ej: Fortnite)').setRequired(true).setMaxLength(50))
      .addRoleOption(o => o.setName('rol').setDescription('Rol que se menciona al buscar grupo').setRequired(true)))
    .addSubcommand(sub => sub.setName('juego-quitar').setDescription('Quita un juego de la lista')
      .addStringOption(o => o.setName('nombre').setDescription('Juego a quitar').setRequired(true).setAutocomplete(true)))
    .addSubcommand(sub => sub.setName('juegos').setDescription('Muestra la configuración y la lista de juegos')),

  async autocomplete(interaction) {
    await interaction.respond(G.opcionesJuegos(interaction.guildId, interaction.options.getFocused())).catch(() => {});
  },

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const responder = (content) => interaction.reply({ content, flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });

    if (sub === 'canal') {
      const canal = interaction.options.getChannel('canal');
      G.update(guild.id, g => { g.config.canalAnuncios = canal.id; });
      return responder(`✅ Los anuncios de \`/buscar-grupo\` se publicarán en ${canal}.`);
    }

    if (sub === 'salas') {
      const g = G.getGuild(guild.id);
      let categoria = g.config.categoriaSalas && guild.channels.cache.get(g.config.categoriaSalas);
      let crear = g.config.canalCrearSala && guild.channels.cache.get(g.config.canalCrearSala);
      if (categoria && crear) return responder(`ℹ️ Ya está configurado: ${crear} dentro de **${categoria.name}**.`);

      if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return responder('❌ El bot necesita el permiso **Gestionar canales** para crear las salas.');
      }
      try {
        if (!categoria) categoria = await guild.channels.create({ name: '🎮 Salas', type: ChannelType.GuildCategory });
        if (!crear) crear = await guild.channels.create({ name: '➕ Crear sala', type: ChannelType.GuildVoice, parent: categoria.id });
        else await crear.setParent(categoria.id);
      } catch (err) {
        console.error('[setup-grupos]', err);
        return responder(`❌ No se pudieron crear los canales: ${mensajeError(err)}`);
      }
      G.update(guild.id, gg => { gg.config.categoriaSalas = categoria.id; gg.config.canalCrearSala = crear.id; });
      return responder(`✅ Listo: al entrar a ${crear} cada persona tendrá su propia sala. El bot también necesita **Mover miembros**.`);
    }

    if (sub === 'juego-agregar') {
      const nombre = interaction.options.getString('nombre').trim();
      const rol = interaction.options.getRole('rol');
      if (rol.id === guild.id) return responder('❌ Elige un rol específico, no @everyone.');
      const { actualizado } = G.update(guild.id, g => G.agregarJuego(g.juegos, nombre, rol.id));
      const mencionable = rol.mentionable || guild.members.me.permissions.has(PermissionFlagsBits.MentionEveryone);
      const aviso = mencionable
        ? ''
        : `\n⚠️ ${rol} no es mencionable y el bot no tiene **Mencionar a todos**: los anuncios no le avisarán. Activa "Permitir que cualquiera mencione este rol" en la configuración del rol.`;
      return responder(`✅ ${actualizado ? 'Actualizado' : 'Agregado'}: **${nombre}** → ${rol}${aviso}`);
    }

    if (sub === 'juego-quitar') {
      const nombre = interaction.options.getString('nombre');
      const quitado = G.update(guild.id, g => G.quitarJuego(g.juegos, nombre));
      return responder(quitado ? `✅ Quitado: **${nombre}**.` : `❌ No hay ningún juego llamado **${nombre}**.`);
    }

    // juegos
    const g = G.getGuild(guild.id);
    const canalTxt = (id) => (id ? `<#${id}>` : '*sin configurar*');
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🎮 Buscar grupo — configuración')
      .addFields(
        { name: 'Canal de anuncios', value: canalTxt(g.config.canalAnuncios), inline: true },
        { name: 'Crear sala', value: canalTxt(g.config.canalCrearSala), inline: true },
        { name: `Juegos (${g.juegos.length})`, value: g.juegos.map(j => `• **${j.nombre}** → <@&${j.rolId}>`).join('\n') || '*ninguno — usa `/setup-grupos juego-agregar`*' },
      )
      .setFooter({ text: 'Santuario Mocho 🌑' });
    return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
