// Sección Cumpleaños: canal de anuncios y lista de cumpleaños registrados.
const SeccionCumpleanos = (() => {
  const esc = Formato.escapar;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function lateral(datos) {
    const [proximo] = datos.lista;
    const texto = !proximo
      ? 'Todavía nadie ha registrado su cumpleaños.'
      : proximo.faltan === 0
        ? `¡Hoy es el cumpleaños de <strong>${esc(proximo.nombre)}</strong>! 🎉`
        : `El próximo es <strong>${esc(proximo.nombre)}</strong>, en ${proximo.faltan} ${proximo.faltan === 1 ? 'día' : 'días'}.`;
    return `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Próximo cumpleaños</p>
        <p>${texto}</p>
        <p class="ayuda">Cada quien registra el suyo con <code>/birthday register</code>.</p>
        <div class="mascota" data-estado="${proximo && proximo.faltan === 0 ? 'feliz' : 'hola'}"></div>
      </div>`;
  }

  function extra(datos) {
    if (!datos.lista.length) return '<div class="tarjeta vacio">Nadie ha registrado su cumpleaños todavía.</div>';
    const filas = datos.lista.map(c => `<li class="fila" data-fila data-texto="${esc(c.nombre.toLowerCase())}">
        <span class="fila-fecha">${c.dia} ${MESES[c.mes - 1]}</span>
        <span class="fila-nombre">${esc(c.nombre)}</span>
        <span class="fila-detalle">${c.faltan === 0 ? '¡Hoy! 🎉' : `en ${c.faltan} ${c.faltan === 1 ? 'día' : 'días'}`}${c.cumple ? ` · cumple ${c.cumple}` : ''}</span>
        <button type="button" class="boton-icono" data-accion-seccion="borrar" data-id="${esc(c.id)}" data-nombre="${esc(c.nombre)}" aria-label="Borrar el cumpleaños de ${esc(c.nombre)}" title="Borrar">${Iconos.svg('borrar')}</button>
      </li>`).join('');
    return `<div class="tarjeta">
        <div class="lista-cabecera">
          <h2 class="tarjeta-titulo">Cumpleaños registrados (${datos.lista.length})</h2>
          <input type="search" class="buscador" data-buscar placeholder="Buscar por nombre…" aria-label="Buscar cumpleaños">
        </div>
        <ul class="lista">${filas}</ul>
      </div>`;
  }

  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'cumpleanos',
      titulo: 'Cumpleaños',
      descripcion: 'El bot felicita a cada quien en su día.',
      campos: [{ ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de cumpleaños' }],
      lateral,
      extra,
      acciones: [{
        id: 'borrar',
        enLista: true,
        cuerpo: (boton) => ({ usuarioId: boton.dataset.id }),
        confirmar: (datos, boton) => ({
          titulo: '¿Borrar este cumpleaños?',
          texto: `Se borrará el cumpleaños de ${boton.dataset.nombre}. Podrá registrarlo de nuevo con /birthday register.`,
          boton: 'Borrar',
          peligro: true,
        }),
      }],
    }),
  };
})();
