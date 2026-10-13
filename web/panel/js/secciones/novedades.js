// Sección Novedades: canal, rol y publicación de NOVEDADES.md.
const SeccionNovedades = (() => {
  const esc = Formato.escapar;

  function lateral(datos) {
    const { info } = datos;
    const vista = info.versionArchivo
      ? `<div class="dc"><div class="dc-embed dc-anuncio"><div class="dc-texto"><div class="h2">🆕 ShadowBot v${esc(info.versionArchivo)}</div>${Formato.formatearMensaje(info.textoArchivo || '')}</div></div></div>`
      : '<p class="texto-suave">NOVEDADES.md todavía no tiene versiones.</p>';
    return `<div class="tarjeta">
        <p class="etiqueta">Estado</p>
        <dl class="datos">
          <dt>Versión más nueva</dt><dd>${info.versionArchivo ? `v${esc(info.versionArchivo)}` : '—'}${info.fechaArchivo ? ` <span class="texto-suave">(${esc(info.fechaArchivo)})</span>` : ''}</dd>
          <dt>Última anunciada</dt><dd>${info.ultimaAnunciada ? `v${esc(info.ultimaAnunciada)}` : 'Ninguna'}</dd>
          <dt>Anuncio automático</dt><dd>${info.automatico ? '<span class="estado-si">Activo</span>' : '<span class="estado-no">Apagado aquí</span>'}</dd>
        </dl>
        ${info.avisoRol ? `<p class="aviso-campo">${esc(info.avisoRol)}</p>` : ''}
      </div>
      <p class="etiqueta">Vista previa de la versión más nueva</p>
      ${vista}`;
  }

  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'novedades',
      titulo: 'Novedades',
      descripcion: 'Dónde anuncia el bot sus actualizaciones. El texto se escribe en <code>NOVEDADES.md</code>.',
      campos: [
        { ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de novedades' },
        { ruta: 'rol', tipo: 'rol', etiqueta: 'Rol a mencionar (opcional)', asignable: false, ayuda: 'Por ejemplo @Novedades, para quien quiera enterarse.' },
      ],
      lateral,
      acciones: [{
        id: 'publicar',
        texto: 'Publicar ahora',
        confirmar: (datos) => ({
          titulo: '¿Publicar las novedades?',
          texto: `Se publicará la v${datos.info.versionArchivo} en el canal de novedades${datos.rol ? ', mencionando al rol elegido' : ''}.`,
          boton: 'Publicar',
        }),
      }],
    }),
  };
})();
