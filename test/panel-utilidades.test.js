// Colores y temporadas del panel (src/web/colores.js, src/web/temporadas.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { normalizarColor } = require('../src/web/colores');
const { temporadaActual } = require('../src/web/temporadas');

test('normalizarColor: hex, nombres de discord.js, números y valores inválidos', () => {
  assert.strictEqual(normalizarColor('#9b59b6', '#000000'), '#9B59B6');
  assert.strictEqual(normalizarColor('Red', '#000000'), '#ED4245');
  assert.strictEqual(normalizarColor(0x123456, '#000000'), '#123456');
  assert.strictEqual(normalizarColor('no-es-color', '#111111'), '#111111');
  assert.strictEqual(normalizarColor(null, '#111111'), '#111111');
  assert.strictEqual(normalizarColor('', '#111111'), '#111111');
});

test('temporadaActual: fechas límite en hora de Guatemala', () => {
  const dia = (iso) => temporadaActual(new Date(iso), null);
  assert.strictEqual(dia('2026-09-30T18:00:00Z'), 'normal');
  assert.strictEqual(dia('2026-10-01T03:00:00Z'), 'normal', 'en Guatemala aún es 30 de septiembre');
  assert.strictEqual(dia('2026-10-01T18:00:00Z'), 'halloween');
  assert.strictEqual(dia('2026-10-07T18:00:00Z'), 'halloween');
  assert.strictEqual(dia('2026-11-02T18:00:00Z'), 'halloween');
  assert.strictEqual(dia('2026-11-03T18:00:00Z'), 'normal');
  assert.strictEqual(dia('2026-12-01T18:00:00Z'), 'navidad');
  assert.strictEqual(dia('2026-12-31T18:00:00Z'), 'navidad');
  assert.strictEqual(dia('2027-01-06T18:00:00Z'), 'navidad', 'cruza el año');
  assert.strictEqual(dia('2027-01-07T18:00:00Z'), 'normal');
});

test('temporadaActual: PANEL_TEMA fuerza un tema válido', () => {
  const octubre = new Date('2026-10-07T18:00:00Z');
  assert.strictEqual(temporadaActual(octubre, 'navidad'), 'navidad');
  assert.strictEqual(temporadaActual(octubre, 'normal'), 'normal');
  assert.strictEqual(temporadaActual(octubre, 'inventado'), 'halloween');
});
