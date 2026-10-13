// Contenido de la landing: funciones y comandos del bot.
// Se usa en el navegador (window.Comandos) y en los tests de Node (module.exports).
// test/landing.test.js compara esta lista con src/commands, src/prefix-commands
// y con lo escrito en index.html: al agregar o quitar un comando hay que tocar ambos.
(function (global) {
  const funciones = [
    { grupo: 'Comunidad', id: 'buscar-grupo', icono: 'grupos', titulo: 'Buscar grupo', texto: 'Publica un anuncio para tu partida y deja que los demás se unan con un botón.' },
    { grupo: 'Comunidad', id: 'salas', icono: 'sala', titulo: 'Salas temporales', texto: 'Entra a "Crear sala" y el bot te abre una sala de voz propia que se borra al quedar vacía.' },
    { grupo: 'Comunidad', id: 'niveles', icono: 'niveles', titulo: 'Niveles y logros', texto: 'Gana experiencia por hablar y escribir, sube de nivel y desbloquea roles.' },
    { grupo: 'Comunidad', id: 'cumpleanos', icono: 'pastel', titulo: 'Cumpleaños', texto: 'Registra tu fecha y el bot te felicita ese día delante de todos.' },
    { grupo: 'Comunidad', id: 'torneos', icono: 'torneo', titulo: 'Torneos', texto: 'Inscripciones, puntos y resultados de torneos de Fortnite, Valorant y más.' },
    { grupo: 'Diversión', id: 'musica', icono: 'musica', titulo: 'Música', texto: 'Pon canciones en el canal de voz y maneja la cola y el volumen.' },
    { grupo: 'Diversión', id: 'economia', icono: 'monedas', titulo: 'Economía y minijuegos', texto: 'Reclama monedas cada día, apuéstalas y pasa el rato con trivia, dados y ruleta.' },
    { grupo: 'Diversión', id: 'ia', icono: 'ia', titulo: 'Inteligencia artificial', texto: 'Hazle preguntas al bot; los admins eligen su nombre y su personalidad.' },
    { grupo: 'Diversión', id: 'adivina', icono: 'acertijo', titulo: 'Adivina la canción', texto: 'Un juego por rondas para ver quién reconoce primero la canción.' },
    { grupo: 'Servidor', id: 'bienvenida', icono: 'bienvenida', titulo: 'Bienvenida y despedida', texto: 'Mensajes personalizados para quien llega y para quien se va.' },
    { grupo: 'Servidor', id: 'moderacion', icono: 'moderacion', titulo: 'Moderación y logs', texto: 'Banear, expulsar, silenciar y limpiar mensajes, con registro de todo lo que pasa.' },
    { grupo: 'Servidor', id: 'verificacion', icono: 'verificacion', titulo: 'Verificación', texto: 'Los nuevos aceptan las reglas con un botón antes de ver el resto del servidor.' },
    { grupo: 'Servidor', id: 'autorespuestas', icono: 'chat', titulo: 'Auto-respuestas', texto: 'El bot contesta solo cuando alguien escribe las palabras que tú elijas.' },
    { grupo: 'Servidor', id: 'novedades', icono: 'novedades', titulo: 'Novedades', texto: 'Cada actualización del bot se anuncia sola en el canal que elijas.' },
    { grupo: 'Servidor', id: 'fortnite', icono: 'tienda', titulo: 'Tienda Fortnite', texto: 'La tienda del día publicada automáticamente en tu canal.' },
    { grupo: 'Servidor', id: 'twitch', icono: 'twitch', titulo: 'Twitch', texto: 'Aviso cuando el canal entra en directo y estadísticas del stream.' },
    { grupo: 'Servidor', id: 'estadisticas', icono: 'estadisticas', titulo: 'Estadísticas', texto: 'Miembros, bots y boosters del servidor siempre a la vista.' },
  ];

  const comandos = [
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'buscar-grupo', descripcion: 'Publica un anuncio para buscar gente con quien jugar' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'sala', descripcion: 'Cambia el nombre o el límite de tu sala temporal, o bloquéala' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'levels', descripcion: 'Tu perfil, el ranking y la lista de niveles' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'achievement', descripcion: 'Roles de logro: verlos, agregarlos y quitarlos' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'birthday', descripcion: 'Registra tu cumpleaños y mira los del servidor' },
    { tipo: 'slash', categoria: 'Comunidad', nombre: 'torneo', descripcion: 'Crea torneos, inscríbete y reporta resultados' },
    { tipo: 'slash', categoria: 'Música', nombre: 'play', descripcion: 'Reproduce una canción o la añade a la cola' },
    { tipo: 'slash', categoria: 'Música', nombre: 'queue', descripcion: 'Muestra la cola de canciones' },
    { tipo: 'slash', categoria: 'Música', nombre: 'skip', descripcion: 'Salta a la siguiente canción' },
    { tipo: 'slash', categoria: 'Música', nombre: 'stop', descripcion: 'Detiene la música y saca al bot del canal de voz' },
    { tipo: 'slash', categoria: 'Música', nombre: 'volume', descripcion: 'Ajusta o consulta el volumen' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'ask', descripcion: 'Hazle una pregunta a la IA del bot' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'adivina-cancion', descripcion: 'Juego por rondas: adivina la canción' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'mcc', descripcion: 'Juego de decisiones entre tres opciones' },
    { tipo: 'slash', categoria: 'Diversión', nombre: 'tienda-fortnite', descripcion: 'Muestra la tienda actual de Fortnite' },
    { tipo: 'slash', categoria: 'Información', nombre: 'stats', descripcion: 'Estadísticas del servidor' },
    { tipo: 'slash', categoria: 'Información', nombre: 'twitch', descripcion: 'Estadísticas del canal de Twitch' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'ban', descripcion: 'Banea a un usuario' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'kick', descripcion: 'Expulsa a un usuario' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'mute', descripcion: 'Silencia a un usuario por unos minutos' },
    { tipo: 'slash', categoria: 'Moderación', nombre: 'clear', descripcion: 'Borra mensajes del canal' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'autorespuesta', descripcion: 'Agrega, elimina y lista auto-respuestas' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-welcome', descripcion: 'Configura la bienvenida' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-goodbye', descripcion: 'Configura la despedida' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-rules', descripcion: 'Publica las reglas del servidor' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-verificacion', descripcion: 'Elige el rol que se da antes de verificar' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-logs', descripcion: 'Canal de logs de actividad' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-modlog', descripcion: 'Canal de logs de moderación' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-security-logs', descripcion: 'Canal de logs de seguridad' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-grupos', descripcion: 'Configura buscar grupo y las salas temporales' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-novedades', descripcion: 'Canal donde el bot anuncia sus novedades' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-ia', descripcion: 'Personalidad y comportamiento de la IA' },
    { tipo: 'slash', categoria: 'Configuración (admins)', nombre: 'setup-tienda-fortnite', descripcion: 'Canal donde se publica la tienda de Fortnite' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: '8ball', alias: [], descripcion: 'Hazle una pregunta a la bola mágica' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'dado', alias: ['dice'], descripcion: 'Lanza un dado' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'moneda', alias: ['coin'], descripcion: 'Cara o cruz' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'ruleta', alias: [], descripcion: 'Gira la ruleta y mira qué te toca' },
    { tipo: 'prefijo', categoria: 'Juegos', nombre: 'trivia', alias: [], descripcion: 'Responde una pregunta y gana monedas si aciertas' },
    { tipo: 'prefijo', categoria: 'Sociales', nombre: 'ship', alias: [], descripcion: 'Mide la compatibilidad entre dos personas' },
    { tipo: 'prefijo', categoria: 'Sociales', nombre: 'rata', alias: [], descripcion: 'El rata-metro del día' },
    { tipo: 'prefijo', categoria: 'Sociales', nombre: 'iq', alias: [], descripcion: 'Tu IQ de hoy, en broma' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'daily', alias: [], descripcion: 'Reclama tus monedas diarias' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'balance', alias: ['bal'], descripcion: 'Mira cuántas monedas tienes' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'apostar', alias: ['bet'], descripcion: 'Apuesta tus monedas' },
    { tipo: 'prefijo', categoria: 'Economía', nombre: 'top', alias: [], descripcion: 'Los que más monedas tienen' },
    { tipo: 'prefijo', categoria: 'Ayuda', nombre: 'comandos', alias: ['help'], descripcion: 'Lista los comandos con prefijo' },
  ];

  // Comandos reales que no se muestran en la landing (pruebas internas)
  const excluidos = ['test-welcome', 'test-goodbye'];

  const api = { funciones, comandos, excluidos };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Comandos = api;
})(typeof window !== 'undefined' ? window : globalThis);
