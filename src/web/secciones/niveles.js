// Sección "niveles": canal de avisos, niveles por actividad y logros especiales.
// Los logros especiales se buscan por su nombre exacto en utils/logros.js, así
// que aquí su nombre es fijo y solo se elige el rol que entregan.
const { enBlanco, vacio, validarCanal, validarRol, validarTexto, validarNumero, validarLista } = require('./comun');

const titulo = 'Niveles y logros';
const almacenes = ['levels'];
const MAX_NIVELES = 50;
const ESPECIALES = [
  { nombre: 'Insomnio', descripcion: 'Estar 40 minutos en voz entre las 12 y las 4 a. m. con alguien más.' },
  { nombre: 'Haz hecho un amigo', descripcion: 'Estar en un canal de voz con un bot.' },
  { nombre: '???', descripcion: '1500 mensajes, 20 horas de voz y 30 días seguidos de actividad.' },
];
const RESERVADOS = ESPECIALES.map(e => e.nombre);

function textoRequisito(horas, mensajes) {
  const partes = [];
  if (horas) partes.push(`${horas}h de voz`);
  if (mensajes) partes.push(`${mensajes} mensajes`);
  return partes.join(' y ');
}

function leer({ levels }) {
  const guardados = levels.niveles || [];
  return {
    canal: levels.canal_notificaciones || null,
    niveles: guardados
      .filter(n => !RESERVADOS.includes(n.nombre))
      .sort((a, b) => (a.nivel ?? 0) - (b.nivel ?? 0))
      .map(n => ({ nivel: n.nivel ?? null, nombre: n.nombre, rolId: n.rol_id || null, horasVoz: n.horas_voz ?? 0, mensajes: n.mensajes ?? 0 })),
    especiales: ESPECIALES.map(e => ({
      nombre: e.nombre,
      descripcion: e.descripcion,
      rolId: guardados.find(n => n.nombre === e.nombre)?.rol_id || null,
    })),
    info: { usuarios: Object.keys(levels.usuarios || {}).length },
  };
}

function validar(body, { guild }) {
  const errores = {};
  const especiales = Array.isArray(body?.especiales) ? body.especiales : [];
  const valores = {
    canal: validarCanal(body?.canal, guild, errores, 'canal'),
    niveles: validarLista(body?.niveles, errores, 'niveles', {
      maximo: MAX_NIVELES,
      esVacia: (fila) => enBlanco(fila.nombre) && vacio(fila.rolId),
      validarFila: (fila, prefijo) => {
        const nivel = validarNumero(fila.nivel, errores, `${prefijo}.nivel`, { min: 1, max: 100 });
        const nombre = validarTexto(fila.nombre, errores, `${prefijo}.nombre`, { min: 1, max: 50 });
        if (nombre && RESERVADOS.includes(nombre)) errores[`${prefijo}.nombre`] = 'Ese nombre está reservado para un logro especial.';
        const rolId = validarRol(fila.rolId, guild, errores, `${prefijo}.rolId`);
        if (!rolId && !errores[`${prefijo}.rolId`]) errores[`${prefijo}.rolId`] = 'Elige el rol que se entrega.';
        const horasVoz = validarNumero(fila.horasVoz ?? 0, errores, `${prefijo}.horasVoz`, { min: 0, max: 10000 });
        const mensajes = validarNumero(fila.mensajes ?? 0, errores, `${prefijo}.mensajes`, { min: 0, max: 1000000 });
        if (horasVoz === 0 && mensajes === 0) errores[`${prefijo}.horasVoz`] = 'Pon horas de voz o mensajes mayores que 0.';
        return { nivel, nombre, rolId, horasVoz, mensajes };
      },
      claveUnica: (fila) => ['nivel', fila.nivel],
    }),
    especiales: ESPECIALES.map((_, i) => validarRol(especiales[i]?.rolId, guild, errores, `especiales.${i}.rolId`)),
  };
  return { valores, errores };
}

function guardar(valores, { levels }) {
  const normales = [...valores.niveles]
    .sort((a, b) => a.nivel - b.nivel)
    .map(n => ({
      nivel: n.nivel,
      nombre: n.nombre,
      rol_id: n.rolId,
      horas_voz: n.horasVoz,
      mensajes: n.mensajes,
      requisito_texto: textoRequisito(n.horasVoz, n.mensajes),
    }));
  // Sin "nivel": así no entran en el cálculo de subida de nivel
  const especiales = ESPECIALES
    .map((e, i) => (valores.especiales[i]
      ? { nombre: e.nombre, rol_id: valores.especiales[i], horas_voz: 0, mensajes: 0, requisito_texto: 'Logro especial' }
      : null))
    .filter(Boolean);
  return { levels: { ...levels, canal_notificaciones: valores.canal, niveles: [...normales, ...especiales] } };
}

module.exports = { titulo, almacenes, ESPECIALES, leer, validar, guardar };
