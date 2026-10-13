// Cookie de sesión del panel (src/web/sesion.js)
const { test } = require('node:test');
const assert = require('node:assert');
const S = require('../src/web/sesion');

const SECRETO = 'secreto-de-prueba';

test('sesion: firmar y leer devuelve los mismos datos', () => {
  const valor = S.crearValor({ id: '1', nombre: 'Ana' }, SECRETO, { ahora: 1000 });
  const datos = S.leerValor(valor, SECRETO, { ahora: 2000 });
  assert.strictEqual(datos.id, '1');
  assert.strictEqual(datos.nombre, 'Ana');
  assert.strictEqual(datos.exp, 1000 + S.DURACION_MS);
});

test('sesion: rechaza cookies alteradas, de otro secreto, caducadas o mal formadas', () => {
  const valor = S.crearValor({ id: '1' }, SECRETO, { ahora: 1000 });
  const [cuerpo, firma] = valor.split('.');
  const otroCuerpo = Buffer.from(JSON.stringify({ id: '2', exp: 1e15 })).toString('base64url');
  assert.strictEqual(S.leerValor(`${otroCuerpo}.${firma}`, SECRETO, { ahora: 2000 }), null, 'cuerpo alterado');
  assert.strictEqual(S.leerValor(valor, 'otro-secreto', { ahora: 2000 }), null, 'otro secreto');
  assert.strictEqual(S.leerValor(valor, SECRETO, { ahora: 1000 + S.DURACION_MS }), null, 'caducada');
  for (const malo of [null, undefined, '', 'abc', `${cuerpo}.`, `${cuerpo}.${firma}.x`]) {
    assert.strictEqual(S.leerValor(malo, SECRETO), null, String(malo));
  }
});

test('leerCookie: encuentra la cookie por nombre y tolera valores raros', () => {
  const req = { headers: { cookie: 'a=1; sb_sesion=abc%2Edef; b=2; roto=%E0%A4%A' } };
  assert.strictEqual(S.leerCookie(req, 'sb_sesion'), 'abc.def');
  assert.strictEqual(S.leerCookie(req, 'no'), null);
  assert.strictEqual(S.leerCookie(req, 'roto'), null);
  assert.strictEqual(S.leerCookie({ headers: {} }, 'a'), null);
});
