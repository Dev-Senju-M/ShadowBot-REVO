// Página de Inicio: saludo, estado del bot, servidor y accesos.
const SeccionInicio = (() => {
  const esc = Formato.escapar;

  function duracion(segundos) {
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (d) return `${d} d ${h} h`;
    if (h) return `${h} h ${m} min`;
    return `${m} min`;
  }

  async function render(contenedor) {
    const { usuario, servidor, bot } = Panel.me;
    const icono = servidor.iconoUrl
      ? `<img src="${esc(servidor.iconoUrl)}" alt="">`
      : `<span class="servidor-inicial">${esc(servidor.nombre.charAt(0))}</span>`;
    contenedor.innerHTML = `
      <header class="cabecera">
        <h1 class="titulo">¡Hola, ${esc(usuario.nombre)}!</h1>
        <div class="trazo"></div>
      </header>
      <div class="inicio-grid">
        <section class="tarjeta inicio-saludo">
          <div class="mascota" data-estado="hola"></div>
          <p>Shadow está despierto y cuidando <strong>${esc(servidor.nombre)}</strong>. Desde aquí puedes configurar el bot sin escribir comandos.</p>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Estado del bot</h2>
          <dl class="datos">
            <dt>Estado</dt><dd><span class="punto-en-linea"></span>${bot.enLinea ? 'En línea' : 'Desconectado'}</dd>
            <dt>Encendido hace</dt><dd>${duracion(bot.uptime)}</dd>
            <dt>Bot</dt><dd>${esc(bot.tag)}</dd>
          </dl>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Servidor</h2>
          <div class="servidor">${icono}<div><strong>${esc(servidor.nombre)}</strong><br><span class="texto-suave">${servidor.miembros} miembros</span></div></div>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Secciones</h2>
          <a class="acceso" href="#/bienvenida">${Iconos.svg('bienvenida', 'icono-seccion')}<span>Bienvenida, despedida y verificación</span></a>
        </section>
      </div>`;
    Mascota.pintar(contenedor);
  }

  return { render };
})();
