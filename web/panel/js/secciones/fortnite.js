// Sección Tienda Fortnite: canal de la tienda diaria y publicación manual.
const SeccionFortnite = (() => {
  const esc = Formato.escapar;
  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'fortnite',
      titulo: 'Tienda Fortnite',
      descripcion: 'El bot publica la tienda del día automáticamente en este canal.',
      campos: [{ ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de la tienda' }],
      lateral: (datos) => `<div class="tarjeta">
          <p class="etiqueta">Estado</p>
          <dl class="datos">
            <dt>API de fnbr.co</dt><dd>${datos.info.apiKey ? '<span class="estado-si">Configurada</span>' : '<span class="estado-no">Falta FNBR_API_KEY</span>'}</dd>
            <dt>Última publicación</dt><dd>${datos.info.ultimaPublicacion ? esc(datos.info.ultimaPublicacion) : 'Nunca'}</dd>
          </dl>
          <p class="ayuda">Se publica sola cada día a las 00:05 UTC, cuando la tienda cambia en el juego.</p>
        </div>`,
      acciones: [{
        id: 'publicar',
        texto: 'Publicar ahora',
        confirmar: { titulo: '¿Publicar la tienda de hoy?', texto: 'Se enviará la tienda actual de Fortnite al canal configurado.', boton: 'Publicar' },
      }],
    }),
  };
})();
