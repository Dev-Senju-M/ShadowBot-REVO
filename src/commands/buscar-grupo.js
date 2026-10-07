const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const G = require('../utils/grupos');
const { embedAnuncio, botonesAnuncio } = require('../utils/grupos-embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buscar-grupo')
    .setDescription('Busca gente para jugar: publica un anuncio con botón para unirse')
    .addStringOption(o => o.setName('juego').setDescription('Juego').setRequired(true).setAutocomplete(true))
    .addIntegerOption(o => o.setName('cupos').setDescription('Tamaño del grupo contándote a ti (ej: 4 = tú + 3)')
      .setRequired(true).setMinValue(G.CUPOS_MIN).setMaxValue(G.CUPOS_MAX))
    .addStringOption(o => o.setName('nota').setDescription('Detalles opcionales (ej: ranked, con micro)').setMaxLength(100)),

  async autocomplete(interaction) {
    await interaction.respond(G.opcionesJuegos(interaction.guildId, interaction.options.getFocused())).catch(() => {});
  },

  async execute(interaction) {
    const guildId = interaction.guildId;
    const error = (msg) => interaction.reply({ content: `❌ ${msg}`, flags: MessageFlags.Ephemeral });
    const g = G.getGuild(guildId);

    if (!g.config.canalAnuncios) return error('Todavía no hay canal de anuncios. Un admin debe usar `/setup-grupos canal`.');
    const juego = G.buscarJuego(g.juegos, interaction.options.getString('juego'));
    if (!juego) {
      const lista = g.juegos.map(j => j.nombre).join(', ') || 'ninguno configurado';
      return error(`Ese juego no está en la lista. Juegos disponibles: ${lista}.`);
    }

    // Se registra antes de cualquier await para que un doble envío no cree dos anuncios
    const anuncio = G.update(guildId, gg => {
      if (G.anuncioDeCreador(gg.anuncios, interaction.user.id)) return null;
      const nuevo = G.crearAnuncio({
        juego: juego.nombre,
        creadorId: interaction.user.id,
        cupos: interaction.options.getInteger('cupos'),
        nota: interaction.options.getString('nota'),
        canalId: gg.config.canalAnuncios,
      });
      gg.anuncios[nuevo.id] = nuevo;
      return nuevo;
    });
    if (!anuncio) return error('Ya tienes un anuncio abierto. Cancélalo o espera a que se complete o expire.');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const fallar = (msg) => {
      G.update(guildId, gg => { delete gg.anuncios[anuncio.id]; });
      return interaction.editReply(`❌ ${msg}`);
    };

    const canal = await interaction.guild.channels.fetch(anuncio.canalId).catch(() => null);
    if (!canal) return fallar('El canal de anuncios ya no existe. Un admin debe configurarlo de nuevo con `/setup-grupos canal`.');

    let mensaje;
    try {
      mensaje = await canal.send({
        content: `<@&${juego.rolId}>`,
        embeds: [embedAnuncio(anuncio)],
        components: [botonesAnuncio(anuncio)],
        allowedMentions: { roles: [juego.rolId] },
      });
    } catch (err) {
      console.error('[buscar-grupo] No se pudo publicar el anuncio:', err.message);
      return fallar(`No pude publicar en ${canal}. Revisa que el bot pueda enviar mensajes ahí.`);
    }

    G.update(guildId, gg => { if (gg.anuncios[anuncio.id]) gg.anuncios[anuncio.id].mensajeId = mensaje.id; });
    return interaction.editReply(`✅ Anuncio publicado: ${mensaje.url}`);
  },
};
