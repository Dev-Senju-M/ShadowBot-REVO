// Al arrancar, publica en el canal de novedades las versiones nuevas de
// NOVEDADES.md. Solo si ANUNCIAR_NOVEDADES=true (producción).
const N = require('../utils/novedades');

module.exports = (client) => {
  client.once('clientReady', async () => {
    if (process.env.ANUNCIAR_NOVEDADES !== 'true') return;
    try {
      const versiones = N.leerVersiones();
      if (!versiones.length) {
        console.warn('[novedades] NOVEDADES.md no existe o no tiene versiones');
        return;
      }
      const lista = N.pendientes(versiones, N.ultimaAnunciada());
      if (!lista.length) return;
      await N.publicar(client, lista);
      console.log(`[novedades] Publicadas: ${lista.map(v => v.version).join(', ')}`);
    } catch (err) {
      console.error('[novedades] No se pudieron publicar:', err.message);
    }
  });
};
