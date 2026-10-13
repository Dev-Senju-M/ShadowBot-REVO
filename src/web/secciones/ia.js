// Sección "ia": nombre, personalidad, modelo y estado de la IA (/ask).
const { MODELOS_VALIDOS, DEFAULT_PERSONALIDAD } = require('../../utils/ai');
const { validarTexto } = require('./comun');

const titulo = 'IA';
const almacenes = ['personalidad'];
const NOMBRES_MODELO = { rapido: 'Rápido (recomendado, más barato)', equilibrado: 'Equilibrado (más capaz)', potente: 'Potente (el más capaz, más lento)' };

function leer({ personalidad }) {
  const p = { ...DEFAULT_PERSONALIDAD, ...personalidad };
  return {
    nombre: p.nombre,
    personalidad: p.personalidad,
    modelo: p.modelo,
    activada: p.activada !== false,
    info: {
      apiKey: Boolean(process.env.OPENAI_API_KEY),
      opcionesModelo: Object.entries(MODELOS_VALIDOS).map(([clave, valor]) => ({ valor, nombre: NOMBRES_MODELO[clave] || valor })),
    },
  };
}

function validar(body) {
  const errores = {};
  const valores = {
    nombre: validarTexto(body?.nombre, errores, 'nombre', { min: 1, max: 32 }),
    personalidad: validarTexto(body?.personalidad, errores, 'personalidad', { min: 1, max: 1500 }),
    modelo: Object.values(MODELOS_VALIDOS).includes(body?.modelo) ? body.modelo : null,
    activada: typeof body?.activada === 'boolean' ? body.activada : null,
  };
  if (!valores.modelo) errores.modelo = 'Elige uno de los modelos disponibles.';
  if (valores.activada === null) errores.activada = 'Valor inválido.';
  return { valores, errores };
}

function guardar(valores, { personalidad }) {
  return { personalidad: { ...personalidad, ...valores } };
}

const acciones = {
  restablecer: {
    titulo: 'Restablecer personalidad',
    async ejecutar() {
      return { mensaje: 'Personalidad restablecida a la de fábrica.', cambios: { personalidad: { ...DEFAULT_PERSONALIDAD } } };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
