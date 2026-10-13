// Sección Auto-respuestas: lista de disparadores y lo que el bot responde.
const SeccionAutorespuestas = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'autorespuestas',
    titulo: 'Auto-respuestas',
    descripcion: 'Respuestas automáticas del bot cuando alguien escribe cierto texto.',
    ancho: true,
    campos: [{
      ruta: 'respuestas', tipo: 'lista', etiqueta: 'Respuestas', clase: 'lista-respuestas', maximo: 100,
      textoAgregar: 'Agregar respuesta', vacio: 'Todavía no hay auto-respuestas. Agrega la primera.',
      columnas: [
        { clave: 'disparador', tipo: 'texto', etiqueta: 'Cuando alguien escribe…', max: 100 },
        { clave: 'respuesta', tipo: 'area', etiqueta: 'El bot responde…', max: 2000, filas: 2 },
      ],
      nuevo: () => ({ disparador: '', respuesta: '' }),
    }],
    lateral: () => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Cómo funciona</p>
        <ul class="pasos">
          <li>Responde si el mensaje <strong>contiene</strong> el texto, en cualquier parte.</li>
          <li><strong>Distingue mayúsculas</strong>: "Hola" y "hola" son distintos.</li>
          <li>Si coinciden varias, solo responde <strong>la primera</strong> de la lista.</li>
        </ul>
        <div class="mascota" data-estado="hola"></div>
      </div>`,
  }),
};
