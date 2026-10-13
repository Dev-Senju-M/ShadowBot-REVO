// Sección "autorespuestas": lista disparador → respuesta.
// events/autorespuesta.js responde si el mensaje CONTIENE el disparador
// (distingue mayúsculas) y solo con la primera coincidencia.
const { enBlanco, validarTexto, validarLista } = require('./comun');

const titulo = 'Auto-respuestas';
const almacenes = ['autorespuestas'];
const MAX_RESPUESTAS = 100;

function leer({ autorespuestas }) {
  return {
    respuestas: Object.entries(autorespuestas || {})
      .filter(([, respuesta]) => typeof respuesta === 'string')
      .map(([disparador, respuesta]) => ({ disparador, respuesta })),
  };
}

function validar(body) {
  const errores = {};
  const valores = {
    respuestas: validarLista(body?.respuestas, errores, 'respuestas', {
      maximo: MAX_RESPUESTAS,
      esVacia: (fila) => enBlanco(fila.disparador) && enBlanco(fila.respuesta),
      validarFila: (fila, prefijo) => ({
        disparador: validarTexto(fila.disparador, errores, `${prefijo}.disparador`, { min: 1, max: 100, recortar: false }),
        respuesta: validarTexto(fila.respuesta, errores, `${prefijo}.respuesta`, { min: 1, max: 2000 }),
      }),
      claveUnica: (fila) => ['disparador', fila.disparador],
    }),
  };
  return { valores, errores };
}

function guardar(valores) {
  return { autorespuestas: Object.fromEntries(valores.respuestas.map(r => [r.disparador, r.respuesta])) };
}

module.exports = { titulo, almacenes, leer, validar, guardar };
