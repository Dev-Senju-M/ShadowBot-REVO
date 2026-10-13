// Sección Buscar grupo: canal de anuncios, juegos con su rol y salas temporales.
const SeccionGrupos = (() => {
  const esc = Formato.escapar;

  function lateral(datos) {
    const { info } = datos;
    const avisos = info.rolesNoMencionables.length
      ? `<p class="aviso-campo">El rol de <strong>${info.rolesNoMencionables.map(esc).join(', ')}</strong> no es mencionable y el bot no tiene "Mencionar a todos": el anuncio no le avisará.</p>`
      : '';
    return `<div class="tarjeta">
        <p class="etiqueta">Estado</p>
        <dl class="datos">
          <dt>Salas temporales</dt><dd>${info.salasListas ? `<span class="estado-si">Listas</span> <span class="texto-suave">🔊 ${esc(info.canalCrearSala)}</span>` : '<span class="estado-no">Sin crear</span>'}</dd>
          <dt>Anuncios abiertos</dt><dd>${info.anunciosAbiertos}</dd>
          <dt>Salas abiertas</dt><dd>${info.salasAbiertas}</dd>
        </dl>
        ${avisos}
        <p class="ayuda">Los miembros usan <code>/buscar-grupo</code> y eligen uno de estos juegos; el bot menciona su rol.</p>
      </div>`;
  }

  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'grupos',
      titulo: 'Buscar grupo',
      descripcion: 'Para que nadie juegue solo: anuncios para armar grupo y salas de voz que se crean solas.',
      ancho: true,
      campos: [
        { ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de anuncios', ayuda: 'Donde se publican los anuncios de <code>/buscar-grupo</code>. Sin canal, el comando queda desactivado.' },
        {
          ruta: 'juegos', tipo: 'lista', etiqueta: 'Juegos', clase: 'lista-juegos', maximo: 25,
          textoAgregar: 'Agregar juego', vacio: 'Todavía no hay juegos. Agrega el primero.',
          columnas: [
            { clave: 'nombre', tipo: 'texto', etiqueta: 'Juego', max: 50 },
            { clave: 'rolId', tipo: 'rol', etiqueta: 'Rol que se menciona', asignable: false },
          ],
          nuevo: () => ({ nombre: '', rolId: null }),
        },
      ],
      lateral,
      acciones: [{
        id: 'crearSalas',
        texto: 'Crear salas temporales',
        oculta: (datos) => datos.info.salasListas,
        confirmar: { titulo: '¿Crear las salas?', texto: 'El bot creará la categoría "🎮 Salas" con el canal "➕ Crear sala". Al entrar ahí, cada persona tendrá su propia sala de voz.', boton: 'Crear' },
      }],
    }),
  };
})();
