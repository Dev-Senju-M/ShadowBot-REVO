// Sección IA: nombre, personalidad, modelo y estado de /ask.
const SeccionIa = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'ia',
    titulo: 'Inteligencia artificial',
    descripcion: 'Cómo se llama y cómo habla Shadow cuando alguien usa <code>/ask</code>.',
    campos: [
      { ruta: 'activada', tipo: 'interruptor', etiqueta: 'IA activada', ayuda: 'Apágala para desactivar /ask y las demás funciones de IA.' },
      { ruta: 'nombre', tipo: 'texto', etiqueta: 'Nombre', max: 32 },
      { ruta: 'modelo', tipo: 'opciones', etiqueta: 'Modelo', opciones: (datos) => datos.info.opcionesModelo },
      { ruta: 'personalidad', tipo: 'area', etiqueta: 'Personalidad', max: 1500, filas: 9, ayuda: 'Describe su tono y carácter. Se usa como instrucción de sistema.' },
    ],
    lateral: (datos) => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Estado</p>
        <dl class="datos">
          <dt>API de OpenAI</dt><dd>${datos.info.apiKey ? '<span class="estado-si">Configurada</span>' : '<span class="estado-no">Falta OPENAI_API_KEY</span>'}</dd>
          <dt>/ask</dt><dd>${datos.activada ? '<span class="estado-si">Disponible</span>' : '<span class="estado-no">Desactivado</span>'}</dd>
        </dl>
        <div class="mascota" data-estado="${datos.activada ? 'feliz' : 'triste'}"></div>
      </div>`,
    acciones: [{
      id: 'restablecer',
      texto: 'Restablecer personalidad',
      confirmar: { titulo: '¿Restablecer la IA?', texto: 'Se volverá al nombre, personalidad y modelo de fábrica.', boton: 'Restablecer', peligro: true },
    }],
  }),
};
