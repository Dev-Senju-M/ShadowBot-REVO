// Sección Bienvenida: pestañas Bienvenida / Despedida / Verificación con
// vista previa del mensaje y barra de cambios sin guardar.
const SeccionBienvenida = (() => {
  const esc = Formato.escapar;
  const PESTANAS = [
    { id: 'bienvenida', nombre: 'Bienvenida' },
    { id: 'despedida', nombre: 'Despedida' },
    { id: 'verificacion', nombre: 'Verificación' },
  ];
  let estado = null; // { original, actual, guild, pestana, errores }
  let contenedor = null;

  const copiar = (o) => JSON.parse(JSON.stringify(o));
  function ponerRuta(obj, ruta, valor) {
    const claves = ruta.split('.');
    const ultima = claves.pop();
    claves.reduce((o, k) => o[k], obj)[ultima] = valor;
  }

  function opcionesCanal(valor) {
    const grupos = new Map();
    for (const canal of estado.guild.canales) {
      const grupo = canal.categoria || 'Sin categoría';
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(canal);
    }
    let html = '<option value="">— Desactivado —</option>';
    for (const [grupo, canales] of grupos) {
      html += `<optgroup label="${esc(grupo)}">${canales.map(c => `<option value="${esc(c.id)}"${c.id === valor ? ' selected' : ''}># ${esc(c.nombre)}</option>`).join('')}</optgroup>`;
    }
    return html;
  }

  function opcionesRol(valor) {
    return '<option value="">— Ninguno —</option>' + estado.guild.roles.map(r => {
      const deshabilitado = !r.asignable && r.id !== valor ? ' disabled' : '';
      const nota = r.asignable ? '' : ' (el bot no puede asignarlo)';
      return `<option value="${esc(r.id)}"${r.id === valor ? ' selected' : ''}${deshabilitado}>@${esc(r.nombre)}${nota}</option>`;
    }).join('');
  }

  function campo(ruta, etiqueta, control, ayuda = '') {
    const id = `c-${ruta.replace('.', '-')}`;
    return `<div class="campo">
      <label for="${id}">${etiqueta}</label>
      ${control(id)}
      ${ayuda ? `<p class="ayuda">${ayuda}</p>` : ''}
      <p class="error-campo" data-error="${ruta}" hidden></p>
    </div>`;
  }

  function formularioMensaje(tipo) {
    const datos = estado.actual[tipo];
    return `<div class="editor">
      <div class="editor-form">
        <div class="fila-campos">
          ${campo(`${tipo}.canal`, `${Iconos.svg('canal')} Canal`, id => `<select id="${id}" data-campo="${tipo}.canal">${opcionesCanal(datos.canal)}</select>`)}
          ${campo(`${tipo}.color`, `${Iconos.svg('color')} Color`, id => `<input type="color" id="${id}" data-campo="${tipo}.color" value="${esc(datos.color.toLowerCase())}">`)}
        </div>
        ${campo(`${tipo}.mensaje`, 'Mensaje', id => `<textarea id="${id}" rows="9" maxlength="4000" data-campo="${tipo}.mensaje" placeholder="Vacío = se usa el mensaje por defecto del bot">${esc(datos.mensaje || '')}</textarea>
          <div class="insertar">Insertar:
            <button type="button" class="chip" data-insertar="{user}">{user} · mención</button>
            <button type="button" class="chip" data-insertar="{tag}">{tag} · nombre</button>
          </div>`)}
      </div>
      <div class="editor-vista">
        <p class="etiqueta">Vista previa</p>
        <div class="dc" data-vista="${tipo}"></div>
      </div>
    </div>`;
  }

  function formularioVerificacion() {
    const v = estado.actual.verificacion;
    return `<div class="editor">
      <div class="editor-form">
        ${campo('verificacion.rolVerificado', `${Iconos.svg('rol')} Rol al verificarse`, id => `<select id="${id}" data-campo="verificacion.rolVerificado">${opcionesRol(v.rolVerificado)}</select>`, 'Se entrega al pulsar ¡Verificar! en el canal de reglas.')}
        ${campo('verificacion.rolSinVerificar', `${Iconos.svg('rol')} Rol sin verificar (opcional)`, id => `<select id="${id}" data-campo="verificacion.rolSinVerificar">${opcionesRol(v.rolSinVerificar)}</select>`, 'Rol temporal al entrar. Si no lo eliges, al entrar se da directamente el rol verificado.')}
        ${campo('verificacion.canalReglas', `${Iconos.svg('canal')} Canal de reglas`, id => `<select id="${id}" data-campo="verificacion.canalReglas">${opcionesCanal(v.canalReglas)}</select>`, 'Se menciona en el mensaje de bienvenida.')}
      </div>
      <div class="editor-vista tarjeta">
        <p class="etiqueta">¿Cómo funciona?</p>
        <ol class="pasos">
          <li>Alguien entra al servidor y recibe el <strong>rol sin verificar</strong>.</li>
          <li>Lee las reglas en el <strong>canal de reglas</strong>.</li>
          <li>Pulsa <strong>¡Verificar!</strong> y recibe el <strong>rol verificado</strong>.</li>
        </ol>
        <div class="mascota" data-estado="hola"></div>
      </div>
    </div>`;
  }

  function nombreCanal(id) {
    const canal = estado.guild.canales.find(c => c.id === id);
    return canal ? `#${canal.nombre}` : null;
  }

  function pintarVista(tipo) {
    const el = contenedor.querySelector(`[data-vista="${tipo}"]`);
    if (!el) return;
    const datos = estado.actual[tipo];
    const nombre = Panel.me.usuario.nombre;
    const cuerpo = datos.mensaje
      ? Formato.formatearMensaje(datos.mensaje, { usuario: nombre, tag: nombre })
      : '<em class="dc-defecto">Se usará el mensaje por defecto del bot.</em>';
    const canal = nombreCanal(datos.canal);
    el.innerHTML = `<div class="dc-mensaje">
        <span class="dc-avatar mascota" data-estado="hola"></span>
        <div class="dc-cuerpo">
          <div class="dc-autor">ShadowBot <span class="dc-bot">BOT</span><span class="dc-hora">Hoy</span></div>
          <div class="dc-embed"><div class="dc-texto">${cuerpo}</div>${tipo === 'bienvenida' ? '<div class="dc-imagen">Imagen de bienvenida</div>' : ''}</div>
        </div>
      </div>
      <p class="dc-canal">${canal ? `Se publica en <strong>${esc(canal)}</strong>` : 'Desactivado: elige un canal para activarlo.'}</p>`;
    el.querySelector('.dc-embed').style.setProperty('--color-embed', datos.color);
    Mascota.pintar(el);
  }

  function mostrarErrores() {
    for (const el of contenedor.querySelectorAll('[data-error]')) {
      const texto = estado.errores[el.dataset.error];
      el.textContent = texto || '';
      el.hidden = !texto;
      const control = contenedor.querySelector(`[data-campo="${el.dataset.error}"]`);
      if (control) control.setAttribute('aria-invalid', texto ? 'true' : 'false');
    }
  }

  function pintar() {
    const pestana = estado.pestana;
    contenedor.innerHTML = `
      <header class="cabecera">
        <h1 class="titulo">Bienvenida y despedida</h1>
        <div class="trazo"></div>
        <p class="descripcion">Lo que el bot dice cuando alguien entra o se va, y cómo se verifican los nuevos.</p>
      </header>
      <div class="pestanas" role="tablist">
        ${PESTANAS.map(p => `<button type="button" class="pestana" role="tab" id="tab-${p.id}" aria-selected="${p.id === pestana}" aria-controls="panel-pestana" data-pestana="${p.id}">${p.nombre}${Object.keys(estado.errores).some(k => k.startsWith(`${p.id}.`)) ? ' <span class="punto-error" aria-label="con errores"></span>' : ''}</button>`).join('')}
      </div>
      <div id="panel-pestana" role="tabpanel" aria-labelledby="tab-${pestana}">
        ${pestana === 'verificacion' ? formularioVerificacion() : formularioMensaje(pestana)}
      </div>`;
    if (pestana === 'verificacion') Mascota.pintar(contenedor);
    else pintarVista(pestana);
    mostrarErrores();
  }

  function haySinGuardar() {
    return JSON.stringify(estado.actual) !== JSON.stringify(estado.original);
  }

  function actualizarCambios() {
    Panel.marcarCambios(haySinGuardar(), { guardar, descartar });
  }

  function alCambiar(evento) {
    const control = evento.target.closest('[data-campo]');
    if (!control) return;
    const ruta = control.dataset.campo;
    const valor = control.value === '' && control.tagName === 'SELECT' ? null : control.value;
    ponerRuta(estado.actual, ruta, ruta.endsWith('.color') ? valor.toUpperCase() : valor);
    if (estado.errores[ruta]) {
      delete estado.errores[ruta];
      mostrarErrores();
    }
    pintarVista(ruta.split('.')[0]);
    actualizarCambios();
  }

  function alHacerClic(evento) {
    const boton = evento.target.closest('button');
    if (!boton) return;
    if (boton.dataset.pestana) {
      estado.pestana = boton.dataset.pestana;
      pintar();
      contenedor.querySelector(`#tab-${estado.pestana}`).focus();
      return;
    }
    if (boton.dataset.insertar) {
      const area = boton.closest('.campo').querySelector('textarea');
      const inicio = area.selectionStart ?? area.value.length;
      const fin = area.selectionEnd ?? area.value.length;
      area.setRangeText(boton.dataset.insertar, inicio, fin, 'end');
      area.focus();
      area.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  async function guardar() {
    try {
      const guardado = await Api.put('/config/bienvenida', estado.actual);
      estado.original = copiar(guardado);
      estado.actual = copiar(guardado);
      estado.errores = {};
      pintar();
      actualizarCambios();
      Panel.aviso('¡Cambios guardados! Shadow ya los está usando.', 'exito');
    } catch (error) {
      if (error.estado === 400 && error.cuerpo?.errores) {
        estado.errores = error.cuerpo.errores;
        estado.pestana = Object.keys(estado.errores)[0].split('.')[0];
        pintar();
        Panel.aviso('Revisa los campos marcados.', 'error');
        return;
      }
      Panel.manejarError(error, { enLinea: true });
    }
  }

  function descartar() {
    estado.actual = copiar(estado.original);
    estado.errores = {};
    pintar();
    actualizarCambios();
  }

  async function render(elemento) {
    contenedor = elemento;
    const [guild, config] = await Promise.all([Api.get('/guild'), Api.get('/config/bienvenida')]);
    estado = { original: copiar(config), actual: copiar(config), guild, pestana: 'bienvenida', errores: {} };
    contenedor.oninput = alCambiar;
    contenedor.onchange = alCambiar;
    contenedor.onclick = alHacerClic;
    pintar();
  }

  return { render };
})();
