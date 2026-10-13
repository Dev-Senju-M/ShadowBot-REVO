// Motor de formularios del panel: cada sección declara sus campos y este
// archivo los pinta, detecta cambios, guarda, muestra errores y ejecuta acciones.
const Formulario = (() => {
  const esc = Formato.escapar;
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  function opcionesCanal(canales, valor) {
    const grupos = new Map();
    for (const canal of canales) {
      const grupo = canal.categoria || 'Sin categoría';
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(canal);
    }
    let html = '<option value="">— Desactivado —</option>';
    for (const [grupo, lista] of grupos) {
      html += `<optgroup label="${esc(grupo)}">${lista.map(c => `<option value="${esc(c.id)}"${c.id === valor ? ' selected' : ''}># ${esc(c.nombre)}</option>`).join('')}</optgroup>`;
    }
    return html;
  }

  function opcionesRol(roles, valor, soloAsignables) {
    return '<option value="">— Ninguno —</option>' + roles.map(r => {
      const bloqueado = soloAsignables && !r.asignable && r.id !== valor;
      const nota = soloAsignables && !r.asignable ? ' (el bot no puede asignarlo)' : '';
      return `<option value="${esc(r.id)}"${r.id === valor ? ' selected' : ''}${bloqueado ? ' disabled' : ''}>@${esc(r.nombre)}${nota}</option>`;
    }).join('');
  }

  function control(campo, valor, guild, datos) {
    const atributos = `id="f-${campo.ruta}" data-campo="${campo.ruta}"`;
    switch (campo.tipo) {
      case 'canal': return `<select ${atributos}>${opcionesCanal(guild.canales, valor)}</select>`;
      case 'rol': return `<select ${atributos}>${opcionesRol(guild.roles, valor, campo.asignable !== false)}</select>`;
      case 'texto': return `<input type="text" ${atributos} maxlength="${campo.max}" value="${esc(valor ?? '')}">`;
      case 'area': return `<textarea ${atributos} rows="${campo.filas || 6}" maxlength="${campo.max}">${esc(valor ?? '')}</textarea>`;
      case 'opciones': {
        const opciones = typeof campo.opciones === 'function' ? campo.opciones(datos) : campo.opciones;
        return `<select ${atributos}>${opciones.map(o => `<option value="${esc(o.valor)}"${o.valor === valor ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select>`;
      }
      default: return '';
    }
  }

  function campoHtml(campo, datos, guild) {
    const ayuda = campo.ayuda ? `<p class="ayuda">${campo.ayuda}</p>` : '';
    const error = `<p class="error-campo" data-error="${campo.ruta}" hidden></p>`;
    if (campo.tipo === 'interruptor') {
      return `<div class="campo"><label class="interruptor">
          <input type="checkbox" id="f-${campo.ruta}" data-campo="${campo.ruta}"${datos[campo.ruta] ? ' checked' : ''}>
          <span class="interruptor-pista" aria-hidden="true"></span><span>${esc(campo.etiqueta)}</span>
        </label>${ayuda}${error}</div>`;
    }
    const icono = campo.icono || { canal: 'canal', rol: 'rol' }[campo.tipo];
    return `<div class="campo">
        <label for="f-${campo.ruta}">${icono ? Iconos.svg(icono) : ''} ${esc(campo.etiqueta)}</label>
        ${control(campo, datos[campo.ruta], guild, datos)}${ayuda}${error}
      </div>`;
  }

  function valorDe(elemento) {
    if (elemento.type === 'checkbox') return elemento.checked;
    if (elemento.tagName === 'SELECT' && elemento.value === '') return null;
    return elemento.value;
  }

  async function crear(contenedor, def) {
    const necesitaGuild = def.campos.some(c => c.tipo === 'canal' || c.tipo === 'rol');
    const [guild, datos] = await Promise.all([necesitaGuild ? Api.get('/guild') : null, Api.get(`/config/${def.seccion}`)]);
    const estado = { original: copiar(datos), actual: copiar(datos), errores: {} };
    const sucio = () => JSON.stringify(estado.actual) !== JSON.stringify(estado.original);
    const accionesVisibles = (def.acciones || []).filter(a => !a.enLista);

    function pintarLateral() {
      const el = contenedor.querySelector('.editor-vista');
      if (!el) return;
      el.innerHTML = def.lateral ? def.lateral(estado.actual) : '';
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

    function actualizar() {
      const hay = sucio();
      Panel.marcarCambios(hay, { guardar, descartar });
      const botones = contenedor.querySelectorAll('[data-accion-seccion]');
      for (const boton of botones) boton.disabled = hay;
      const aviso = contenedor.querySelector('.aviso-acciones');
      if (aviso) aviso.hidden = !hay || !botones.length;
    }

    function pintar() {
      contenedor.innerHTML = `
        <header class="cabecera">
          <h1 class="titulo">${esc(def.titulo)}</h1>
          <div class="trazo"></div>
          ${def.descripcion ? `<p class="descripcion">${def.descripcion}</p>` : ''}
        </header>
        <div class="editor">
          <div class="editor-form">
            ${def.campos.map(c => campoHtml(c, estado.actual, guild)).join('')}
            ${accionesVisibles.length ? `<div class="acciones-seccion">${accionesVisibles.map(a => `<button type="button" class="boton boton-secundario" data-accion-seccion="${a.id}">${esc(a.texto)}</button>`).join('')}</div>` : ''}
            <p class="ayuda aviso-acciones" hidden>Guarda o descarta los cambios antes de usar las acciones.</p>
          </div>
          <div class="editor-vista"></div>
        </div>
        ${def.extra ? `<div class="seccion-extra">${def.extra(estado.actual)}</div>` : ''}`;
      pintarLateral();
      mostrarErrores();
      actualizar();
      Mascota.pintar(contenedor);
    }

    function filtrar(texto) {
      const buscado = texto.trim().toLowerCase();
      for (const fila of contenedor.querySelectorAll('[data-fila]')) {
        fila.hidden = Boolean(buscado) && !fila.dataset.texto.includes(buscado);
      }
    }

    function alCambiar(evento) {
      const buscador = evento.target.closest('[data-buscar]');
      if (buscador) {
        filtrar(buscador.value);
        return;
      }
      const elemento = evento.target.closest('[data-campo]');
      if (!elemento) return;
      const ruta = elemento.dataset.campo;
      estado.actual[ruta] = valorDe(elemento);
      if (estado.errores[ruta]) {
        delete estado.errores[ruta];
        mostrarErrores();
      }
      pintarLateral();
      actualizar();
    }

    async function recargar() {
      const nuevos = await Api.get(`/config/${def.seccion}`);
      estado.original = copiar(nuevos);
      estado.actual = copiar(nuevos);
      estado.errores = {};
      pintar();
    }

    async function ejecutar(boton) {
      if (sucio()) {
        Panel.aviso('Guarda o descarta los cambios primero.', 'error');
        return;
      }
      const accion = (def.acciones || []).find(a => a.id === boton.dataset.accionSeccion);
      if (!accion) return;
      if (accion.confirmar) {
        const opciones = typeof accion.confirmar === 'function' ? accion.confirmar(estado.actual, boton) : accion.confirmar;
        if (!(await Dialogo.confirmar(opciones))) return;
      }
      boton.disabled = true;
      try {
        const respuesta = await Api.post(`/config/${def.seccion}/${accion.id}`, accion.cuerpo ? accion.cuerpo(boton) : {});
        estado.original = copiar(respuesta.seccion);
        estado.actual = copiar(respuesta.seccion);
        estado.errores = {};
        pintar();
        Panel.aviso(respuesta.mensaje, 'exito');
      } catch (error) {
        if (error.estado === 404) {
          Panel.aviso(error.message, 'error');
          await recargar().catch(() => {});
        } else if (error.estado === 400 || error.estado === 502) {
          Panel.aviso(error.message, 'error');
        } else {
          Panel.manejarError(error, { enLinea: true });
        }
      } finally {
        if (boton.isConnected) boton.disabled = sucio();
      }
    }

    function alHacerClic(evento) {
      const boton = evento.target.closest('[data-accion-seccion]');
      if (boton) ejecutar(boton);
    }

    async function guardar() {
      try {
        const guardado = await Api.put(`/config/${def.seccion}`, estado.actual);
        estado.original = copiar(guardado);
        estado.actual = copiar(guardado);
        estado.errores = {};
        pintar();
        Panel.aviso('¡Cambios guardados! Shadow ya los está usando.', 'exito');
      } catch (error) {
        if (error.estado === 400 && error.cuerpo?.errores) {
          estado.errores = error.cuerpo.errores;
          mostrarErrores();
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
    }

    contenedor.oninput = alCambiar;
    contenedor.onchange = alCambiar;
    contenedor.onclick = alHacerClic;
    pintar();
  }

  return { crear };
})();
