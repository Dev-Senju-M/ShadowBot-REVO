// Sección "fortnite": canal de la tienda diaria y publicación manual.
const shop = require('../../utils/fortnite-shop');
const { ErrorAccion, validarCanal } = require('./comun');

const titulo = 'Tienda Fortnite';
const almacenes = ['config'];

function leer({ config }) {
  return {
    canal: config.fortniteShopChannel || null,
    info: { apiKey: Boolean(process.env.FNBR_API_KEY), ultimaPublicacion: config.fortniteLastPosted ?? null },
  };
}

function validar(body, { guild }) {
  const errores = {};
  return { valores: { canal: validarCanal(body?.canal, guild, errores, 'canal') }, errores };
}

function guardar(valores, { config }) {
  return { config: { ...config, fortniteShopChannel: valores.canal } };
}

const acciones = {
  publicar: {
    titulo: 'Publicar ahora',
    async ejecutar(body, { guild }, { config }) {
      if (!process.env.FNBR_API_KEY) throw new ErrorAccion('Falta FNBR_API_KEY en las variables del bot.');
      if (!config.fortniteShopChannel) throw new ErrorAccion('Elige y guarda primero el canal de la tienda.');
      const canal = guild.channels.cache.get(config.fortniteShopChannel);
      if (!canal) throw new ErrorAccion('El canal de la tienda ya no existe.');
      let mensajes;
      try {
        mensajes = await shop.buildMessages(await shop.fetchShop());
      } catch (err) {
        throw new ErrorAccion(`No se pudo obtener la tienda: ${err.message}`, 502);
      }
      for (const mensaje of mensajes) await canal.send(mensaje);
      return { mensaje: 'Tienda de Fortnite publicada.' };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
