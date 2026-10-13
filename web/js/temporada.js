// Tema de temporada calculado en el navegador (fechas en hora de Guatemala).
// Mismas reglas que src/web/temporadas.js; test/landing.test.js comprueba que coinciden.
(function (global) {
  const TEMPORADAS = [
    { tema: 'halloween', desde: [10, 1], hasta: [11, 2] },
    { tema: 'navidad', desde: [12, 1], hasta: [1, 6] }, // cruza el año
  ];
  const TEMAS = ['normal', ...TEMPORADAS.map(t => t.tema)];

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

  function temporadaActual(fecha = new Date(), zona = 'America/Guatemala') {
    const hoy = mesDia(fecha, zona);
    return TEMPORADAS.find(t => enRango(hoy, t.desde, t.hasta))?.tema ?? 'normal';
  }

  const api = { TEMAS, TEMPORADAS, temporadaActual };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Temporada = api;
})(typeof window !== 'undefined' ? window : globalThis);
