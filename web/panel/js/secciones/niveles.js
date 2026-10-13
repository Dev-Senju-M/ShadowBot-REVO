// Sección Niveles y logros: canal de avisos, niveles por actividad y logros especiales.
const SeccionNiveles = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'niveles',
    titulo: 'Niveles y logros',
    descripcion: 'Roles que el bot entrega según los mensajes y el tiempo en voz de cada quien.',
    ancho: true,
    campos: [
      { ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de avisos', ayuda: 'Donde el bot anuncia las subidas de nivel y los logros. Vacío = sin avisos.' },
      {
        ruta: 'niveles', tipo: 'lista', etiqueta: 'Niveles', clase: 'lista-niveles', maximo: 50,
        textoAgregar: 'Agregar nivel', vacio: 'Todavía no hay niveles. Agrega el primero.',
        ayuda: 'Se alcanza un nivel al cumplir <strong>las horas de voz y los mensajes</strong> a la vez. Borrar un nivel no quita el rol a quien ya lo tiene.',
        columnas: [
          { clave: 'nivel', tipo: 'numero', etiqueta: 'Nivel', min: 1, max: 100 },
          { clave: 'nombre', tipo: 'texto', etiqueta: 'Nombre', max: 50 },
          { clave: 'rolId', tipo: 'rol', etiqueta: 'Rol que entrega' },
          { clave: 'horasVoz', tipo: 'numero', etiqueta: 'Horas de voz', min: 0, max: 10000 },
          { clave: 'mensajes', tipo: 'numero', etiqueta: 'Mensajes', min: 0, max: 1000000 },
        ],
        nuevo: (filas) => ({ nivel: Math.max(0, ...filas.map(f => f.nivel || 0)) + 1, nombre: '', rolId: null, horasVoz: 0, mensajes: 0 }),
      },
      {
        ruta: 'especiales', tipo: 'lista', etiqueta: 'Logros especiales', clase: 'lista-especiales', fija: true,
        ayuda: 'Se consiguen de formas secretas. Elige el rol que entrega cada uno; sin rol, el logro queda desactivado.',
        columnas: [
          { clave: 'nombre', tipo: 'fijo', etiqueta: 'Logro', detalle: 'descripcion' },
          { clave: 'rolId', tipo: 'rol', etiqueta: 'Rol que entrega' },
        ],
      },
    ],
    lateral: (datos) => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Progreso</p>
        <p><strong>${datos.info.usuarios}</strong> ${datos.info.usuarios === 1 ? 'persona tiene' : 'personas tienen'} progreso guardado. Cambiar los niveles no lo borra.</p>
        <p class="ayuda">Cada quien ve el suyo con <code>/levels profile</code>.</p>
        <div class="mascota" data-estado="hola"></div>
      </div>`,
  }),
};
