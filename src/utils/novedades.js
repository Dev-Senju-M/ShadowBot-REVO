// Novedades del bot: lee NOVEDADES.md, decide qué versiones faltan por
// anunciar y arma los mensajes. parsear, pendientes, dividirTexto y
// mensajesDeVersion son puras (test/novedades.test.js); el resto lee el
// archivo, la base de datos o envía a Discord.
const fs = require('fs');
const path = require('path');
const { EmbedBuilder } = require('discord.js');
const store = require('./db');

const ARCHIVO = path.join(__dirname, '..', '..', 'NOVEDADES.md');
const MAX_PENDIENTES = 5;
const MAX_EMBED = 4096; // caracteres en la descripción de un embed
const MAX_EMBEDS_POR_MENSAJE = 10;
const MAX_CHARS_POR_MENSAJE = 6000;
const COLOR = '#9B59B6';

// "## 1.2.0 — 2026-10-07" → versión "1.2.0", fecha "2026-10-07" (la fecha es opcional)
const ENCABEZADO = /^##\s+(\S+)(?:\s+[—–-]\s+(.+?))?\s*$/;

// Devuelve las versiones del archivo, de la más nueva a la más vieja
function parsear(contenido) {
  const versiones = [];
  let actual = null;
  for (const linea of String(contenido).replace(/\r\n/g, '\n').split('\n')) {
    const m = linea.match(ENCABEZADO);
    if (m) {
      actual = { version: m[1], fecha: m[2] ?? null, lineas: [] };
      versiones.push(actual);
    } else if (actual) {
      actual.lineas.push(linea);
    }
  }
  return versiones.map(v => ({ version: v.version, fecha: v.fecha, texto: v.lineas.join('\n').trim() }));
}

// Versiones por anunciar, de la más vieja a la más nueva.
// ultima: versión ya anunciada (o null si nunca se anunció nada).
function pendientes(versiones, ultima) {
  if (!versiones.length) return [];
  const indice = versiones.findIndex(v => v.version === ultima);
  if (indice === 0) return [];
  if (indice === -1) return [versiones[0]];
  return versiones.slice(0, Math.min(indice, MAX_PENDIENTES)).reverse();
}

// Parte un texto por líneas en trozos de máximo `max` caracteres
function partirPorLineas(texto, max) {
  const trozos = [];
  let actual = '';
  for (const linea of texto.split('\n')) {
    const junto = actual ? `${actual}\n${linea}` : linea;
    if (junto.length <= max) {
      actual = junto;
      continue;
    }
    if (actual) trozos.push(actual);
    let resto = linea;
    while (resto.length > max) { // una sola línea más larga que el límite
      trozos.push(resto.slice(0, max));
      resto = resto.slice(max);
    }
    actual = resto;
  }
  if (actual) trozos.push(actual);
  return trozos;
}

// Divide el texto por secciones ("### ") y junta secciones seguidas mientras
// quepan en `max` caracteres. No se pierde texto.
function dividirTexto(texto, max = MAX_EMBED) {
  const piezas = [];
  for (const seccion of texto.split(/\n(?=### )/)) {
    piezas.push(...(seccion.length <= max ? [seccion] : partirPorLineas(seccion, max)));
  }
  const trozos = [];
  for (const pieza of piezas) {
    const ultimo = trozos.length - 1;
    if (ultimo >= 0 && trozos[ultimo].length + 1 + pieza.length <= max) trozos[ultimo] += `\n${pieza}`;
    else trozos.push(pieza);
  }
  return trozos.map(t => t.trim()).filter(Boolean);
}

function largoEmbed(embed) {
  const d = embed.data;
  return (d.title?.length ?? 0) + (d.description?.length ?? 0) + (d.footer?.text.length ?? 0);
}

// Agrupa embeds en mensajes de máximo 10 embeds y 6000 caracteres
function agruparEnMensajes(embeds) {
  const mensajes = [];
  let actual = [];
  let chars = 0;
  for (const embed of embeds) {
    const largo = largoEmbed(embed);
    if (actual.length && (actual.length >= MAX_EMBEDS_POR_MENSAJE || chars + largo > MAX_CHARS_POR_MENSAJE)) {
      mensajes.push({ embeds: actual });
      actual = [];
      chars = 0;
    }
    actual.push(embed);
    chars += largo;
  }
  if (actual.length) mensajes.push({ embeds: actual });
  return mensajes;
}

// Mensajes listos para enviar con el anuncio de una versión
function mensajesDeVersion(version) {
  const trozos = dividirTexto(version.texto || '*Sin detalles.*');
  const pie = version.fecha ? `Versión ${version.version} • ${version.fecha}` : `Versión ${version.version}`;
  const embeds = trozos.map((trozo, i) => {
    const embed = new EmbedBuilder().setColor(COLOR).setDescription(trozo);
    if (i === 0) embed.setTitle(`🆕 ShadowBot v${version.version}`);
    if (i === trozos.length - 1) embed.setFooter({ text: pie });
    return embed;
  });
  return agruparEnMensajes(embeds);
}

function leerVersiones() {
  if (!fs.existsSync(ARCHIVO)) return [];
  return parsear(fs.readFileSync(ARCHIVO, 'utf8'));
}

function ultimaAnunciada() {
  return store.get('config').novedadesVersion ?? null;
}

// Publica las versiones en el canal configurado y marca cada una como
// anunciada después de enviarla. Lanza un Error con mensaje para el usuario.
async function publicar(client, versiones) {
  const config = store.get('config');
  if (!config.novedadesChannel) throw new Error('No hay canal de novedades configurado. Usa `/setup-novedades canal`.');
  const canal = await client.channels.fetch(config.novedadesChannel).catch(() => null);
  if (!canal) throw new Error('El canal de novedades ya no existe. Configúralo de nuevo con `/setup-novedades canal`.');

  const rol = config.novedadesRole;
  for (const version of versiones) {
    const mensajes = mensajesDeVersion(version);
    for (let i = 0; i < mensajes.length; i++) {
      const mencionar = i === 0 && rol;
      try {
        await canal.send({
          ...mensajes[i],
          ...(mencionar ? { content: `<@&${rol}>` } : {}),
          allowedMentions: { roles: mencionar ? [rol] : [] },
        });
      } catch (err) {
        throw new Error(`No pude enviar en ${canal}: ${err.message}`);
      }
    }
    const actualizado = store.get('config');
    actualizado.novedadesVersion = version.version;
    store.set('config', actualizado);
  }
}

module.exports = {
  parsear, pendientes, dividirTexto, mensajesDeVersion,
  leerVersiones, ultimaAnunciada, publicar,
};
