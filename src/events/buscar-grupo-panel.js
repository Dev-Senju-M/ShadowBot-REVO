// Botones de los anuncios de /buscar-grupo y caducidad de anuncios.
const { MessageFlags, PermissionFlagsBits } = require('discord.js');
const G = require('../utils/grupos');
const { embedAnuncio, embedListo, embedCerrado, botonesAnuncio } = require('../utils/grupos-embeds');
const { crearSala, mensajeError } = require('../utils/salas');

// Aplica la acción del botón de forma síncrona (antes de cualquier await).
// Devuelve el resultado junto con una copia del anuncio tal como quedó.
function aplicarAccion(interaction, accion, anuncioId) {
  return G.update(interaction.guildId, g => {
    const anuncio = g.anuncios[anuncioId];
    if (!anuncio) return { ok: false, error: 'Este anuncio ya no está activo.' };
    const userId = interaction.user.id;
    let resultado;
    if (accion === 'unirme') resultado = G.unirse(anuncio, userId);
    else if (accion === 'salir') resultado = G.salir(anuncio, userId);
    else if (accion === 'empezar') resultado = G.empezar(anuncio, userId);
    else if (accion === 'cancelar') {
      const esMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
      if (userId !== anuncio.creadorId && !esMod) {
        resultado = { ok: false, error: 'Solo quien creó el anuncio o un moderador puede cancelarlo.' };
      } else {
        delete g.anuncios[anuncioId];
        resultado = { ok: true, cancelado: true };
      }
    } else {
      resultado = { ok: false, error: 'Acción desconocida.' };
    }
    return { ...resultado, anuncio: { ...anuncio, miembros: [...anuncio.miembros] } };
  });
}

async function iniciarGrupo(interaction, anuncio) {
  await interaction.deferUpdate();
  const guild = interaction.guild;
  const config = G.getGuild(guild.id).config;
  const creador = await guild.members.fetch(anuncio.creadorId).catch(() => null);

  let sala;
  try {
    sala = await crearSala(guild, {
      nombre: `🎮 ${anuncio.juego} · ${creador?.displayName ?? 'grupo'}`,
      parentId: config.categoriaSalas ?? interaction.channel?.parentId,
      ownerId: anuncio.creadorId,
      tipo: 'grupo',
      userLimit: anuncio.cupos,
    });
  } catch (err) {
    console.error('[buscar-grupo] No se pudo crear la sala:', err.message);
    G.update(guild.id, g => { if (g.anuncios[anuncio.id]) g.anuncios[anuncio.id].estado = 'abierto'; });
    await interaction.editReply({ embeds: [embedAnuncio(anuncio)], components: [botonesAnuncio(anuncio)] }).catch(() => {});
    await interaction.followUp({ content: `❌ No se pudo crear la sala de voz: ${mensajeError(err)}`, flags: MessageFlags.Ephemeral });
    return;
  }

  G.update(guild.id, g => { delete g.anuncios[anuncio.id]; });
  await interaction.editReply({ embeds: [embedListo(anuncio, sala)], components: [botonesAnuncio(anuncio, true)] });
  await interaction.channel.send({
    content: `${anuncio.miembros.map(id => `<@${id}>`).join(' ')} ¡Su sala está lista! → ${sala}`,
    allowedMentions: { users: anuncio.miembros },
  });
}

async function revisarCaducados(client) {
  for (const guildId of G.allGuildIds()) {
    if (!G.anunciosVencidos(G.getGuild(guildId).anuncios).length) continue;
    const vencidos = G.update(guildId, g => {
      const lista = G.anunciosVencidos(g.anuncios);
      for (const a of lista) delete g.anuncios[a.id];
      return lista;
    });
    for (const anuncio of vencidos) {
      const canal = await client.channels.fetch(anuncio.canalId).catch(() => null);
      const mensaje = anuncio.mensajeId ? await canal?.messages.fetch(anuncio.mensajeId).catch(() => null) : null;
      await mensaje?.edit({ embeds: [embedCerrado(anuncio, 'expirado')], components: [botonesAnuncio(anuncio, true)] }).catch(() => {});
    }
  }
}

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !interaction.customId.startsWith('gr_')) return;
    const [, accion, anuncioId] = interaction.customId.split('_');
    try {
      const resultado = aplicarAccion(interaction, accion, anuncioId);
      if (!resultado.ok) return await interaction.reply({ content: `❌ ${resultado.error}`, flags: MessageFlags.Ephemeral });

      const { anuncio } = resultado;
      if (resultado.cancelado) {
        return await interaction.update({ embeds: [embedCerrado(anuncio, 'cancelado')], components: [botonesAnuncio(anuncio, true)] });
      }
      if (anuncio.estado === 'iniciando') return await iniciarGrupo(interaction, anuncio);
      return await interaction.update({ embeds: [embedAnuncio(anuncio)], components: [botonesAnuncio(anuncio)] });
    } catch (err) {
      console.error('[buscar-grupo]', err);
      const payload = { content: '❌ Hubo un error.', flags: MessageFlags.Ephemeral };
      if (interaction.deferred || interaction.replied) await interaction.followUp(payload).catch(() => {});
      else await interaction.reply(payload).catch(() => {});
    }
  });

  client.once('clientReady', () => {
    revisarCaducados(client).catch(console.error);
    setInterval(() => revisarCaducados(client).catch(console.error), 60 * 1000);
  });
};
