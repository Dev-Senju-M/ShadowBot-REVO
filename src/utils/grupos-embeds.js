// Embeds y botones de los anuncios de buscar grupo
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const COLOR_ABIERTO = '#5865F2';
const COLOR_LISTO = '#57F287';
const COLOR_CERRADO = '#95A5A6';
const FOOTER = 'Buscar grupo • Santuario Mocho 🌑';

function campoMiembros(anuncio) {
  return {
    name: `👥 Miembros (${anuncio.miembros.length}/${anuncio.cupos})`,
    value: anuncio.miembros.map((id, i) => `${i === 0 ? '👑' : '•'} <@${id}>`).join('\n'),
  };
}

function base(anuncio, color, titulo) {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(titulo)
    .setDescription(`<@${anuncio.creadorId}> busca grupo${anuncio.nota ? `\n> ${anuncio.nota}` : ''}`)
    .addFields(campoMiembros(anuncio))
    .setFooter({ text: FOOTER })
    .setTimestamp(anuncio.creadoEn);
}

function embedAnuncio(anuncio) {
  const faltan = anuncio.cupos - anuncio.miembros.length;
  return base(anuncio, COLOR_ABIERTO, `🎮 ${anuncio.juego} — ${faltan > 0 ? `faltan ${faltan}` : 'completo'}`)
    .addFields({ name: '⏳ Expira', value: `<t:${Math.floor(anuncio.expiraEn / 1000)}:R>` });
}

function embedListo(anuncio, sala) {
  return base(anuncio, COLOR_LISTO, `✅ ${anuncio.juego} — ¡grupo listo!`)
    .addFields({ name: '🔊 Sala', value: `${sala}` });
}

function embedCerrado(anuncio, motivo) {
  const titulo = motivo === 'expirado' ? `⌛ ${anuncio.juego} — expirado` : `🚫 ${anuncio.juego} — cancelado`;
  return base(anuncio, COLOR_CERRADO, titulo);
}

function botonesAnuncio(anuncio, desactivados = false) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`gr_unirme_${anuncio.id}`).setLabel('Me uno').setEmoji('✋').setStyle(ButtonStyle.Success).setDisabled(desactivados),
    new ButtonBuilder().setCustomId(`gr_salir_${anuncio.id}`).setLabel('Salir').setStyle(ButtonStyle.Secondary).setDisabled(desactivados),
    new ButtonBuilder().setCustomId(`gr_empezar_${anuncio.id}`).setLabel('Empezar ya').setEmoji('🚀').setStyle(ButtonStyle.Primary).setDisabled(desactivados),
    new ButtonBuilder().setCustomId(`gr_cancelar_${anuncio.id}`).setLabel('Cancelar').setStyle(ButtonStyle.Danger).setDisabled(desactivados),
  );
}

module.exports = { embedAnuncio, embedListo, embedCerrado, botonesAnuncio };
