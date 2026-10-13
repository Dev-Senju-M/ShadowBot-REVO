// Motor de formularios del panel: cada sección declara sus campos y este
// archivo los pinta, detecta cambios, guarda, muestra errores y ejecuta acciones.
// Tipos de campo: canal, rol, texto, numero, area, opciones, interruptor y lista
// (filas editables con columnas de esos mismos tipos, más "fijo").
const Formulario = (() => {
  const esc = Formato.escapar;
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  function ponerRuta(objeto, ruta, valor) {
    const claves = ruta.split('.');
    const ultima = claves.pop();
    claves.reduce((o, clave) => o[clave], objeto)[ultima] = valor;
  }

  function opcionesCanal(canales, valor) {
    const grupos = new Map();
    for (const canal of canales) {
      const grupo = canal.categoria || 'Sin categoría';
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(canal);
    }
    let html = '<option value="">— Desactivado —</option>';
    if (valor && !canales.some(c => c.id === valor)) html += `<option value="${esc(valor)}" selected>(canal que ya no existe)</option>`;
    for (const [grupo, lista] of grupos) {
      html += `<optgroup label="${esc(grupo)}">${lista.map(c => `<option value="${esc(c.id)}"${c.id === valor ? ' selected' : ''}># ${esc(c.nombre)}</option>`).join('')}</optgroup>`;
    }
    return html;
  }

  function opcionesRol(roles, valor, soloAsignables) {
    let html = '<option value="">— Ninguno —</option>';
    if (valor && !roles.some(r => r.id === valor)) html += `<option value="${esc(valor)}" selected>(rol que ya no existe)</option>`;
    return html + roles.map(r => {
      const bloqueado = soloAsignables && !r.asignable && r.id !== valor;
      const nota = soloAsignables && !r.asignable ? ' (el bot no puede asignarlo)' : '';
      return `<option value="${esc(r.id)}"${r.id === valor ? ' selected' : ''}${bloqueado ? ' disabled' : ''}>@${esc(r.nombre)}${nota}</option>`;
    }).join('');
  }

  // Control de un campo o de una celda; `ruta` es la ruta completa del valor
  function control(def, ruta, valor, guild, datos, etiquetaAria = '') {
    const atributos = `id="f-${ruta}" data-campo="${ruta}"${etiquetaAria ? ` aria-label="${esc(etiquetaAria)}"` : ''}`;
    switch (def.tipo) {
      case 'canal': return `<select ${atributos}>${opcionesCanal(guild.canales, valor)}</select>`;
      case 'rol': return `<select ${atributos}>${opcionesRol(guild.roles, valor, def.asignable !== false)}</select>`;
      case 'texto': return `<input type="text" ${atributos} maxlength="${def.max}" value="${esc(valor ?? '')}">`;
      case 'numero': return `<input type="number" ${atributos} min="${def.min}" max="${def.max}" step="1" inputmode="numeric" value="${esc(valor ?? '')}">`;
      case 'area': return `<textarea ${atributos} rows="${def.filas || 6}" maxlength="${def.max}">${esc(valor ?? '')}</textarea>`;
      case 'opciones': {
        const opciones = typeof def.opciones === 'function' ? def.opciones(datos) : def.opciones;
        return `<select ${atributos}>${opciones.map(o => `<option value="${esc(o.valor)}"${o.valor === valor ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select>`;
      }
      default: return '';
    }
  }

  function celdaHtml(campo, columna, fila, indice, guild, datos) {
    if (columna.tipo === 'fijo') {
      return `<div class="celda celda-fija"><strong>${esc(fila[columna.clave])}</strong>${columna.detalle ? `<span class="ayuda">${esc(fila[columna.detalle])}</span>` : ''}</div>`;
    }
    const ruta = `${campo.ruta}.${indice}.${columna.clave}`;
    return `<div class="celda">
        <span class="celda-etiqueta" aria-hidden="true">${esc(columna.etiqueta)}</span>
        ${control(columna, ruta, fila[columna.clave], guild, datos, `${columna.etiqueta}, fila ${indice + 1}`)}
        <p class="error-campo" data-error="${ruta}" hidden></p>
      </div>`;
  }

  function listaHtml(campo, datos, guild) {
    const filas = datos[campo.ruta] || [];
    const lleno = Boolean(campo.maximo) && filas.length >= campo.maximo;
    const cabecera = `<div class="lista-edit-cabecera" aria-hidden="true">${campo.columnas.map(c => `<span>${esc(c.etiqueta)}</span>`).join('')}${campo.fija ? '' : '<span></span>'}</div>`;
    const cuerpo = filas.map((fila, i) => `<div class="fila-edit" data-fila-edit>
        ${campo.columnas.map(c => celdaHtml(campo, c, fila, i, guild, datos)).join('')}
        ${campo.fija ? '' : `<button type="button" class="boton-icono" data-quitar-fila="${campo.ruta}" data-indice="${i}" aria-label="Quitar la fila ${i + 1}" title="Quitar">${Iconos.svg('borrar')}</button>`}
      </div>`).join('');
    return `<div class="campo campo-lista ${campo.clase || ''}">
        <p class="etiqueta">${esc(campo.etiqueta)}${campo.maximo ? ` <span class="texto-suave">(${filas.length}/${campo.maximo})</span>` : ''}</p>
        ${campo.ayuda ? `<p class="ayuda ayuda-lista">${campo.ayuda}</p>` : ''}
        <div class="lista-edit">${filas.length ? cabecera + cuerpo : `<p class="lista-vacia">${esc(campo.vacio || 'Todavía no hay nada aquí.')}</p>`}</div>
        <p class="error-campo" data-error="${campo.ruta}" hidden></p>
        ${campo.fija ? '' : `<button type="button" class="boton boton-secundario boton-agregar" data-agregar-fila="${campo.ruta}"${lleno ? ' disabled' : ''}>${Iconos.svg('agregar')} ${esc(campo.textoAgregar || 'Agregar')}</button>`}
      </div>`;
  }

  function campoHtml(campo, datos, guild) {
    if (campo.tipo === 'lista') return listaHtml(campo, datos, guild);
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
        ${control(campo, campo.ruta, datos[campo.ruta], guild, datos)}${ayuda}${error}
      </div>`;
  }

  function valorDe(elemento) {
    if (elemento.type === 'checkbox') return elemento.checked;
    if (elemento.type === 'number') return elemento.value === '' ? null : Number(elemento.value);
    if (elemento.tagName === 'SELECT' && elemento.value === '') return null;
    return elemento.value;
  }

  const usaServidor = (def) => def.tipo === 'canal' || def.tipo === 'rol';

  async function crear(contenedor, def) {
    const necesitaGuild = def.campos.some(c => usaServidor(c) || (c.columnas || []).some(usaServidor));
    const [guild, datos] = await Promise.all([necesitaGuild ? Api.get('/guild') : null, Api.get(`/config/${def.seccion}`)]);
    const estado = { original: copiar(datos), actual: copiar(datos), errores: {} };
    const sucio = () => JSON.stringify(estado.actual) !== JSON.stringify(estado.original);

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
        const controlDelError = contenedor.querySelector(`[data-campo="${el.dataset.error}"]`);
        if (controlDelError) controlDelError.setAttribute('aria-invalid', texto ? 'true' : 'false');
      }
      for (const fila of contenedor.querySelectorAll('[data-fila-edit]')) {
        fila.classList.toggle('con-error', Boolean(fila.querySelector('.error-campo:not([hidden])')));
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
      const acciones = (def.acciones || []).filter(a => !a.enLista && !(a.oculta && a.oculta(estado.actual)));
      contenedor.innerHTML = `
        <header class="cabecera">
          <h1 class="titulo">${esc(def.titulo)}</h1>
          <div class="trazo"></div>
          ${def.descripcion ? `<p class="descripcion">${def.descripcion}</p>` : ''}
        </header>
        <div class="editor${def.ancho ? ' editor-ancho' : ''}">
          <div class="editor-form">
            ${def.campos.map(c => campoHtml(c, estado.actual, guild)).join('')}
            ${acciones.length ? `<div class="acciones-seccion">${acciones.map(a => `<button type="button" class="boton boton-secundario" data-accion-seccion="${a.id}">${esc(a.texto)}</button>`).join('')}</div>` : ''}
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
      ponerRuta(estado.actual, ruta, valorDe(elemento));
      if (estado.errores[ruta]) {
        delete estado.errores[ruta];
        mostrarErrores();
      }
      pintarLateral();
      actualizar();
    }

    function agregarFila(ruta) {
      const campo = def.campos.find(c => c.ruta === ruta);
      const filas = estado.actual[ruta];
      if (campo.maximo && filas.length >= campo.maximo) return;
      filas.push(campo.nuevo(filas));
      pintar();
      contenedor.querySelector(`[data-campo^="${ruta}.${filas.length - 1}."]`)?.focus();
    }

    function quitarFila(ruta, indice) {
      estado.actual[ruta].splice(indice, 1);
      // Los índices cambian: los errores anteriores de esta lista ya no corresponden
      for (const clave of Object.keys(estado.errores)) {
        if (clave === ruta || clave.startsWith(`${ruta}.`)) delete estado.errores[clave];
      }
      pintar();
      contenedor.querySelector(`[data-agregar-fila="${ruta}"]`)?.focus();
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
      const agregar = evento.target.closest('[data-agregar-fila]');
      if (agregar) {
        agregarFila(agregar.dataset.agregarFila);
        return;
      }
      const quitar = evento.target.closest('[data-quitar-fila]');
      if (quitar) {
        quitarFila(quitar.dataset.quitarFila, Number(quitar.dataset.indice));
        return;
      }
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
          contenedor.querySelector('[aria-invalid="true"]')?.focus();
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
