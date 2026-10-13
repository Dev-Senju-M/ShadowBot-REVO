// Colores de embeds: el panel siempre trabaja con '#RRGGBB'.
const { resolveColor } = require('discord.js');

const HEX = /^#[0-9a-f]{6}$/i;

// Convierte un color guardado (hex, nombre de discord.js como "Red" o número)
// a '#RRGGBB'; si no es válido devuelve porDefecto
function normalizarColor(valor, porDefecto) {
  if (typeof valor === 'string' && HEX.test(valor)) return valor.toUpperCase();
  if (valor === null || valor === undefined || valor === '') return porDefecto;
  try {
    return `#${resolveColor(valor).toString(16).padStart(6, '0').toUpperCase()}`;
  } catch {
    return porDefecto;
  }
}

module.exports = { HEX, normalizarColor };
