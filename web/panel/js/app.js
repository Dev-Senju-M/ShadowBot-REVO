// Arranque del panel: tema, usuario, barra lateral, navegación y avisos.
const Panel = (() => {
  const esc = Formato.escapar;
  const $ = (selector) => document.querySelector(selector);
  const SECCIONES = [
    { ruta: 'inicio', nombre: 'Inicio', icono: 'inicio', grupo: null, modulo: () => SeccionInicio },
    { ruta: 'bienvenida', nombre: 'Bienvenida', icono: 'bienvenida', grupo: 'Servidor', modulo: () => SeccionBienvenida },
    { ruta: 'logs', nombre: 'Logs', icono: 'logs', grupo: 'Servidor', modulo: () => SeccionLogs },
    { ruta: 'cumpleanos', nombre: 'Cumpleaños', icono: 'pastel', grupo: 'Servidor', modulo: () => SeccionCumpleanos },
    { ruta: 'novedades', nombre: 'Novedades', icono: 'novedades', grupo: 'Comunidad', modulo: () => SeccionNovedades },
    { ruta: 'fortnite', nombre: 'Tienda Fortnite', icono: 'tienda', grupo: 'Comunidad', modulo: () => SeccionFortnite },
    { ruta: 'ia', nombre: 'IA', icono: 'ia', grupo: 'Comunidad', modulo: () => SeccionIa },
    { ruta: 'grupos', nombre: 'Buscar grupo', icono: 'grupos', grupo: 'Comunidad', modulo: () => SeccionGrupos },
    { ruta: 'niveles', nombre: 'Niveles', icono: 'niveles', grupo: 'Comunidad', modulo: () => SeccionNiveles },
    { ruta: 'autorespuestas', nombre: 'Auto-respuestas', icono: 'chat', grupo: 'Comunidad', modulo: () => SeccionAutorespuestas },
  ];
  let rutaActual = null;
  let sucio = false;
  let manejadores = null;
  let ignorarHash = false;
  let temporizadorAviso = null;

  const panel = { me: null, secciones: SECCIONES, marcarCambios, aviso, manejarError };

  function aplicarTema(tema) {
    document.documentElement.dataset.tema = tema;
    Mascota.pintar(document);
    Mascota.decorar($('.decoracion'), tema);
  }

  function marcarCambios(valor, nuevos) {
    sucio = valor;
    if (nuevos) manejadores = nuevos;
    $('#barra-guardar').hidden = !valor;
  }

  function aviso(texto, tipo = 'exito') {
    const el = $('#aviso');
    el.className = `aviso aviso-${tipo}`;
    el.innerHTML = `<span class="mascota" data-estado="${tipo === 'exito' ? 'feliz' : 'triste'}"></span><span class="aviso-texto"></span>`;
    el.querySelector('.aviso-texto').textContent = texto;
    Mascota.pintar(el);
    el.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { el.hidden = true; }, 4500);
  }

  function pantallaError(titulo, texto, acciones = '') {
    const cont = $('#contenido');
    cont.innerHTML = `<div class="pantalla-error tarjeta">
      <div class="mascota" data-estado="triste"></div>
      <h1 class="titulo">${esc(titulo)}</h1>
      <p>${esc(texto)}</p>
      <div class="acciones">${acciones}</div>
    </div>`;
    Mascota.pintar(cont);
  }

  function manejarError(error, { enLinea = false } = {}) {
    if (error.estado === 401) return;
    if (error.estado === 403) {
      pantallaError('No tienes acceso', 'Necesitas Administrador o Gestionar servidor en el servidor del bot.', '<button type="button" class="boton" data-accion="salir">Cerrar sesión</button>');
      return;
    }
    if (error.estado === 503) {
      pantallaError('Shadow se está despertando…', 'El bot está arrancando. Reintento en unos segundos.');
      setTimeout(() => location.reload(), 5000);
      return;
    }
    if (enLinea) {
      aviso(error.message || 'Algo falló. Inténtalo de nuevo.', 'error');
      return;
    }
    pantallaError('Algo falló', error.message || 'No se pudo cargar la página.', '<button type="button" class="boton" data-accion="reintentar">Reintentar</button>');
  }

  function pintarUsuario() {
    const { usuario } = panel.me;
    $('#usuario').innerHTML = `<img src="${esc(usuario.avatarUrl)}" alt="">
      <span class="usuario-nombre">${esc(usuario.nombre)}</span>
      <button type="button" class="boton-icono" data-accion="salir" aria-label="Cerrar sesión" title="Cerrar sesión">${Iconos.svg('salir')}</button>`;
  }

  function pintarBarraLateral() {
    const enlace = (s) => `<a href="#/${s.ruta}" data-ruta="${s.ruta}">${Iconos.svg(s.icono, 'icono-seccion')}<span>${s.nombre}</span></a>`;
    let html = SECCIONES.filter(s => !s.grupo).map(enlace).join('');
    for (const grupo of [...new Set(SECCIONES.map(s => s.grupo).filter(Boolean))]) {
      html += `<p class="grupo">${grupo}</p>` + SECCIONES.filter(s => s.grupo === grupo).map(enlace).join('');
    }
    $('#barra-lateral').innerHTML = html;
  }

  async function navegar() {
    if (ignorarHash) {
      ignorarHash = false;
      return;
    }
    const ruta = location.hash.replace(/^#\/?/, '') || 'inicio';
    const seccion = SECCIONES.find(s => s.ruta === ruta) || SECCIONES[0];
    if (sucio && seccion.ruta !== rutaActual) {
      if (!confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?')) {
        ignorarHash = true;
        location.hash = `#/${rutaActual}`;
        return;
      }
      marcarCambios(false);
    }
    rutaActual = seccion.ruta;
    for (const enlace of document.querySelectorAll('#barra-lateral a')) {
      const activo = enlace.dataset.ruta === seccion.ruta;
      enlace.classList.toggle('activo', activo);
      if (activo) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    }
    document.body.classList.remove('menu-abierto');
    $('#boton-menu').setAttribute('aria-expanded', 'false');
    document.title = `${seccion.nombre} · ShadowBot`;
    const cont = $('#contenido');
    cont.oninput = cont.onchange = cont.onclick = null; // quita los manejadores de la sección anterior
    cont.innerHTML = '<div class="cargando"><span class="mascota" data-estado="hola"></span>Cargando…</div>';
    Mascota.pintar(cont);
    try {
      await seccion.modulo().render(cont);
      cont.focus({ preventScroll: true });
    } catch (error) {
      manejarError(error);
    }
  }

  function alHacerClic(evento) {
    const objetivo = evento.target.closest('[data-accion], #boton-menu, #boton-guardar, #boton-descartar');
    if (!objetivo) return;
    if (objetivo.id === 'boton-menu') {
      const abierto = document.body.classList.toggle('menu-abierto');
      objetivo.setAttribute('aria-expanded', String(abierto));
    } else if (objetivo.id === 'boton-guardar') {
      manejadores?.guardar();
    } else if (objetivo.id === 'boton-descartar') {
      manejadores?.descartar();
    } else if (objetivo.dataset.accion === 'salir') {
      if (sucio && !confirm('Tienes cambios sin guardar. ¿Cerrar sesión igualmente?')) return;
      sucio = false;
      Api.cerrarSesion().finally(() => { location.href = '/panel/login.html'; });
    } else if (objetivo.dataset.accion === 'reintentar') {
      location.reload();
    }
  }

  async function iniciar() {
    $('#boton-menu').innerHTML = Iconos.svg('menu');
    document.addEventListener('click', alHacerClic);
    window.addEventListener('beforeunload', (evento) => {
      if (!sucio) return;
      evento.preventDefault();
      evento.returnValue = '';
    });
    fetch('/api/tema').then(r => r.json()).then(d => aplicarTema(d.temporada)).catch(() => aplicarTema('normal'));
    try {
      panel.me = await Api.get('/me');
    } catch (error) {
      manejarError(error);
      return;
    }
    aplicarTema(panel.me.temporada);
    pintarUsuario();
    pintarBarraLateral();
    window.addEventListener('hashchange', navegar);
    await navegar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
  return panel;
})();
