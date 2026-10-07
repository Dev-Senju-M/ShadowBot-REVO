// Novedades del bot (src/utils/novedades.js) y el NOVEDADES.md real.
// No toca Discord ni la base de datos. Ejecutar con: npm test
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const N = require('../src/utils/novedades');

const sinEspacios = (s) => s.replace(/\s+/g, '');
const version = (v) => ({ version: v, fecha: null, texto: `Cambios ${v}` });

test('parsear: ignora el texto previo, respeta el orden y la fecha es opcional', () => {
  const md = '# Novedades\nintro\n\n## 1.1.0 — 2026-10-20\n### Sección\n- uno\n\n## 1.0.0\n- base\n';
  assert.deepStrictEqual(N.parsear(md), [
    { version: '1.1.0', fecha: '2026-10-20', texto: '### Sección\n- uno' },
    { version: '1.0.0', fecha: null, texto: '- base' },
  ]);
});

test('parsear: acepta guion corto y saltos de línea de Windows; sin versiones → []', () => {
  assert.deepStrictEqual(N.parsear('## 2.0.0 - hoy\r\ntexto\r\n'), [{ version: '2.0.0', fecha: 'hoy', texto: 'texto' }]);
  assert.deepStrictEqual(N.parsear(''), []);
  assert.deepStrictEqual(N.parsear('# Solo título\n### No es versión'), []);
});

test('pendientes: qué versiones se anuncian', () => {
  const versiones = ['1.7.0', '1.6.0', '1.5.0', '1.4.0', '1.3.0', '1.2.0', '1.1.0', '1.0.0'].map(version);
  const nombres = (lista) => lista.map(v => v.version);
  assert.deepStrictEqual(N.pendientes([], null), []);
  assert.deepStrictEqual(N.pendientes(versiones, '1.7.0'), [], 'ya se anunció la última');
  assert.deepStrictEqual(nombres(N.pendientes(versiones, '1.5.0')), ['1.6.0', '1.7.0']);
  assert.deepStrictEqual(nombres(N.pendientes(versiones, '1.0.0')), ['1.3.0', '1.4.0', '1.5.0', '1.6.0', '1.7.0'], 'máximo 5');
  assert.deepStrictEqual(nombres(N.pendientes(versiones, null)), ['1.7.0'], 'nunca se anunció nada');
  assert.deepStrictEqual(nombres(N.pendientes(versiones, '0.9.0')), ['1.7.0'], 'la guardada no existe');
});

test('dividirTexto: un texto corto queda en un solo trozo', () => {
  assert.deepStrictEqual(N.dividirTexto('### A\n- x\n### B\n- y'), ['### A\n- x\n### B\n- y']);
});

test('dividirTexto: un texto largo se divide en trozos ≤ 4096 sin perder texto', () => {
  const seccion = (n) => `### Sección ${n}\n` + Array.from({ length: 40 }, (_, i) => `- línea ${i} de la sección ${n} con algo de texto`).join('\n');
  const texto = Array.from({ length: 6 }, (_, n) => seccion(n)).join('\n\n') + '\n' + 'x'.repeat(5000);
  const trozos = N.dividirTexto(texto);
  assert.ok(trozos.length > 1);
  for (const t of trozos) assert.ok(t.length <= 4096, `trozo de ${t.length} caracteres`);
  assert.strictEqual(sinEspacios(trozos.join('')), sinEspacios(texto));
});

test('mensajesDeVersion: respeta los límites; título en el primero y pie en el último', () => {
  const texto = Array.from({ length: 30 }, (_, n) => `### S${n}\n` + 'texto '.repeat(400)).join('\n');
  const mensajes = N.mensajesDeVersion({ version: '9.9.9', fecha: '2026-10-07', texto });
  const embeds = mensajes.flatMap(m => m.embeds);
  for (const m of mensajes) {
    assert.ok(m.embeds.length <= 10);
    const chars = m.embeds.reduce((s, e) => s + (e.data.title?.length ?? 0) + (e.data.description?.length ?? 0) + (e.data.footer?.text.length ?? 0), 0);
    assert.ok(chars <= 6000, `mensaje de ${chars} caracteres`);
  }
  assert.strictEqual(embeds[0].data.title, '🆕 ShadowBot v9.9.9');
  assert.match(embeds.at(-1).data.footer.text, /9\.9\.9 • 2026-10-07/);
  assert.ok(embeds.slice(1).every(e => !e.data.title), 'solo el primero lleva título');
});

test('NOVEDADES.md real: se lee bien y sus mensajes respetan los límites', () => {
  const versiones = N.parsear(fs.readFileSync(path.join(__dirname, '..', 'NOVEDADES.md'), 'utf8'));
  assert.ok(versiones.length >= 1, 'no hay versiones');
  assert.strictEqual(new Set(versiones.map(v => v.version)).size, versiones.length, 'versiones repetidas');
  for (const v of versiones) {
    assert.ok(v.texto, `la v${v.version} no tiene texto`);
    for (const m of N.mensajesDeVersion(v)) assert.ok(m.embeds.length <= 10);
  }
});
