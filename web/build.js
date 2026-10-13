// Build de la landing para Netlify: genera config.js con las URLs del bot.
// No modifica index.html. Variables: STATUS_URL (URL completa de /health del bot)
// y PANEL_URL (origen del bot, p. ej. https://mi-bot.up.railway.app).
const fs = require('fs');
const path = require('path');

function generarConfig(env = process.env) {
  const statusUrl = (env.STATUS_URL || '').trim();
  const origen = (env.PANEL_URL || '').trim().replace(/\/+$/, '');
  const config = { statusUrl, panelUrl: origen ? `${origen}/panel/` : '' };
  return `// Generado por build.js. No editar.\nwindow.SHADOWBOT = ${JSON.stringify(config)};\n`;
}

if (require.main === module) {
  if (!process.env.STATUS_URL) console.warn('⚠  STATUS_URL no definida: el estado del bot mostrará "No disponible"');
  if (!process.env.PANEL_URL) console.warn('⚠  PANEL_URL no definida: no se mostrará el botón "Abrir panel"');
  fs.writeFileSync(path.join(__dirname, 'config.js'), generarConfig());
  console.log('✅ config.js generado');
}

module.exports = { generarConfig };
