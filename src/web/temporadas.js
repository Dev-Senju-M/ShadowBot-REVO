// Tema del panel según la temporada (fechas en hora de Guatemala).
// Para agregar una temporada basta con sumar una entrada aquí y su tema en styles.css.
const TEMPORADAS = [
  { tema: 'halloween', desde: [10, 1], hasta: [11, 2] },
  { tema: 'navidad', desde: [12, 1], hasta: [1, 6] }, // cruza el año
];
const TEMAS = ['normal', ...TEMPORADAS.map(t => t.tema)];

// [mes, día] de una fecha en la zona horaria dada
function mesDia(fecha, zona) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: zona, month: 'numeric', day: 'numeric' }).formatToParts(fecha);
  const valor = (tipo) => Number(partes.find(p => p.type === tipo).value);
  return [valor('month'), valor('day')];
}

function enRango([mes, dia], desde, hasta) {
  const n = mes * 100 + dia;
  const a = desde[0] * 100 + desde[1];
  const b = hasta[0] * 100 + hasta[1];
  return a <= b ? n >= a && n <= b : n >= a || n <= b;
}

function temporadaActual(fecha = new Date(), override = process.env.PANEL_TEMA, zona = 'America/Guatemala') {
  if (override && TEMAS.includes(override)) return override;
  const hoy = mesDia(fecha, zona);
  return TEMPORADAS.find(t => enRango(hoy, t.desde, t.hasta))?.tema ?? 'normal';
}

module.exports = { TEMAS, TEMPORADAS, temporadaActual };
