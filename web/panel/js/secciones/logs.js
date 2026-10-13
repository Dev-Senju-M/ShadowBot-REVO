// Sección Logs: canales de moderación, actividad y seguridad.
const SeccionLogs = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'logs',
    titulo: 'Logs',
    descripcion: 'Dónde deja el bot el registro de lo que pasa en el servidor.',
    campos: [
      { ruta: 'moderacion', tipo: 'canal', etiqueta: 'Canal de moderación', ayuda: 'Ban, kick, mute y clear.' },
      { ruta: 'actividad', tipo: 'canal', etiqueta: 'Canal de actividad', ayuda: 'Entradas y salidas, voz, mensajes editados o borrados y cambios de perfil.' },
      { ruta: 'seguridad', tipo: 'canal', etiqueta: 'Canal de seguridad', ayuda: 'Roles y canales creados o borrados, permisos peligrosos, webhooks y los cambios hechos desde este panel. Si lo dejas vacío, van al de moderación.' },
    ],
    lateral: () => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Consejo</p>
        <p>Usa canales privados que solo vea el staff. Con <strong>Enviar prueba</strong> compruebas que el bot pueda escribir en cada uno.</p>
        <div class="mascota" data-estado="hola"></div>
      </div>`,
    acciones: [{ id: 'probar', texto: 'Enviar prueba' }],
  }),
};
