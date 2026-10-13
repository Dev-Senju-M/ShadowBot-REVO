// Landing pública: tema de temporada, mascota e iconos, estado del bot,
// botones del panel, menú móvil, pestañas y buscador de comandos.
// Sin JavaScript la página se lee igual: todo el contenido está en index.html.
(() => {
  const cfg = window.SHADOWBOT || {};
  const raiz = document.documentElement;
  raiz.classList.add('con-js');

  // ── Tema, iconos y mascota ──
  const tema = Temporada.TEMAS.includes(cfg.tema) ? cfg.tema : Temporada.temporadaActual();
  raiz.dataset.tema = tema;
  document.querySelectorAll('[data-icono]').forEach(el => { el.innerHTML = Iconos.svg(el.dataset.icono); });
  Mascota.pintar(document, tema);
  Mascota.decorar(document.querySelector('.decoracion'), tema);

  // ── Números ──
  const numeros = { comandos: Comandos.comandos.length, funciones: Comandos.funciones.length };
  document.querySelectorAll('[data-numero]').forEach(el => { el.textContent = numeros[el.dataset.numero]; });

  // ── Panel: sin URL los botones y el bloque se quedan ocultos ──
  const panelUrl = Texto.urlSegura(cfg.panelUrl);
  if (panelUrl) {
    document.querySelectorAll('[data-panel]').forEach(el => {
      if (el.tagName === 'A') el.href = panelUrl;
      el.hidden = false;
    });
  }

  // ── Estado del bot ──
  const ETIQUETAS = { online: 'En línea', maintenance: 'Mantenimiento', starting: 'Iniciando…', offline: 'No disponible' };
  const estado = document.getElementById('estado');
  const estadoTexto = document.getElementById('estado-texto');
  function ponerEstado(valor) {
    estado.dataset.estado = valor;
    estadoTexto.textContent = ETIQUETAS[valor];
  }
  const statusUrl = Texto.urlSegura(cfg.statusUrl);
  async function comprobarEstado() {
    try {
      const res = await fetch(statusUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error('respuesta no válida');
      const datos = await res.json();
      ponerEstado(['online', 'maintenance', 'starting'].includes(datos.status) ? datos.status : 'online');
    } catch {
      ponerEstado('offline');
    }
  }
  if (statusUrl) {
    comprobarEstado();
    setInterval(comprobarEstado, 60 * 1000);
  }

  // ── Menú móvil ──
  const botonMenu = document.getElementById('boton-menu');
  function menu(abierto) {
    document.body.classList.toggle('menu-abierto', abierto);
    botonMenu.setAttribute('aria-expanded', String(abierto));
  }
  botonMenu.addEventListener('click', () => menu(!document.body.classList.contains('menu-abierto')));
  document.getElementById('menu').addEventListener('click', (e) => { if (e.target.closest('a')) menu(false); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') menu(false); });

  // ── Pestañas y buscador ──
  const listas = [...document.querySelectorAll('.lista-comandos')];
  const pestanas = [...document.querySelectorAll('.pestana[data-tipo]')];
  const buscador = document.getElementById('buscar');
  const sinResultados = document.getElementById('sin-resultados');
  const pista = document.getElementById('sin-resultados-pista');
  const NOMBRES = { slash: 'Comandos /', prefijo: 'Comandos !' };
  let activa = 'slash';

  function filtrar() {
    const busqueda = buscador.value;
    const cuentas = {};
    for (const lista of listas) {
      let total = 0;
      for (const categoria of lista.querySelectorAll('.categoria')) {
        let enCategoria = 0;
        // Buscar "música" o "moderación" muestra la categoría entera
        const titulo = categoria.querySelector('h4').textContent;
        for (const fila of categoria.querySelectorAll('.comando')) {
          const visible = Texto.coincide(`${fila.textContent} ${titulo}`, busqueda);
          fila.hidden = !visible;
          if (visible) enCategoria++;
        }
        categoria.hidden = enCategoria === 0;
        total += enCategoria;
      }
      cuentas[lista.dataset.tipo] = total;
      lista.hidden = lista.dataset.tipo !== activa || total === 0;
    }
    document.querySelectorAll('[data-cuenta]').forEach(el => { el.textContent = `(${cuentas[el.dataset.cuenta]})`; });
    sinResultados.hidden = cuentas[activa] > 0;
    const otra = activa === 'slash' ? 'prefijo' : 'slash';
    pista.textContent = cuentas[otra] > 0 ? `Hay ${cuentas[otra]} en «${NOMBRES[otra]}».` : '';
  }

  function activar(tipo, enfocar = false) {
    activa = tipo;
    for (const pestana of pestanas) {
      const elegida = pestana.dataset.tipo === tipo;
      pestana.setAttribute('aria-selected', String(elegida));
      pestana.tabIndex = elegida ? 0 : -1;
      if (elegida && enfocar) pestana.focus();
    }
    filtrar();
  }

  pestanas.forEach((pestana, i) => {
    pestana.addEventListener('click', () => activar(pestana.dataset.tipo));
    pestana.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const paso = e.key === 'ArrowRight' ? 1 : -1;
      activar(pestanas[(i + paso + pestanas.length) % pestanas.length].dataset.tipo, true);
    });
  });
  buscador.addEventListener('input', filtrar);
  document.getElementById('herramientas').hidden = false;
  activar('slash');
})();
