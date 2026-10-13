// Sección "bienvenida" del panel (src/web/secciones/bienvenida.js)
const { test } = require('node:test');
const assert = require('node:assert');
const { ChannelType } = require('discord.js');
const B = require('../src/web/secciones/bienvenida');

function guildFalso() {
  const puede = () => ({ has: () => true });
  const canales = new Map([
    ['c-general', { id: 'c-general', type: ChannelType.GuildText, permissionsFor: puede }],
    ['c-anuncios', { id: 'c-anuncios', type: ChannelType.GuildAnnouncement, permissionsFor: puede }],
    ['c-voz', { id: 'c-voz', type: ChannelType.GuildVoice, permissionsFor: puede }],
    ['c-privado', { id: 'c-privado', type: ChannelType.GuildText, permissionsFor: () => ({ has: () => false }) }],
  ]);
  const roles = new Map([
    ['g1', { id: 'g1', position: 0, managed: false }],
    ['r-nuevo', { id: 'r-nuevo', position: 1, managed: false }],
    ['r-miembro', { id: 'r-miembro', position: 2, managed: false }],
    ['r-bot', { id: 'r-bot', position: 3, managed: true }],
    ['r-admin', { id: 'r-admin', position: 9, managed: false }],
  ]);
  return { id: 'g1', channels: { cache: canales }, roles: { cache: roles }, members: { me: { roles: { highest: { position: 5 } } } } };
}
const ctx = () => ({ guild: guildFalso() });

const valido = () => ({
  bienvenida: { canal: 'c-general', mensaje: '  Hola {user}  ', color: '#c0392b' },
  despedida: { canal: null, mensaje: '', color: '#2C3E50' },
  verificacion: { rolVerificado: 'r-miembro', rolSinVerificar: 'r-nuevo', canalReglas: 'c-anuncios' },
});

test('bienvenida: declara su almacén', () => {
  assert.deepStrictEqual(B.almacenes, ['config']);
});

test('validar: datos correctos sin errores', () => {
  const { valores, errores } = B.validar(valido(), ctx());
  assert.deepStrictEqual(errores, {});
  assert.deepStrictEqual(valores.bienvenida, { canal: 'c-general', mensaje: 'Hola {user}', color: '#C0392B' });
  assert.deepStrictEqual(valores.despedida, { canal: null, mensaje: null, color: '#2C3E50' });
  assert.deepStrictEqual(valores.verificacion, { rolVerificado: 'r-miembro', rolSinVerificar: 'r-nuevo', canalReglas: 'c-anuncios' });
});

test('validar: canales inexistentes, de voz o sin permiso', () => {
  for (const [canal, texto] of [['c-no', /canal de texto/], ['c-voz', /canal de texto/], ['c-privado', /no puede escribir/], [123, /canal de texto/]]) {
    const body = valido();
    body.bienvenida.canal = canal;
    assert.match(B.validar(body, ctx()).errores['bienvenida.canal'], texto, String(canal));
  }
});

test('validar: roles @everyone, gestionados, por encima del bot o repetidos', () => {
  for (const [rol, texto] of [['g1', /no @everyone/], ['r-bot', /integración/], ['r-admin', /por encima/], ['r-no', /no @everyone/]]) {
    const body = valido();
    body.verificacion.rolVerificado = rol;
    assert.match(B.validar(body, ctx()).errores['verificacion.rolVerificado'], texto, rol);
  }
  const body = valido();
  body.verificacion.rolSinVerificar = 'r-miembro';
  assert.match(B.validar(body, ctx()).errores['verificacion.rolSinVerificar'], /distinto/);
});

test('validar: mensaje demasiado largo y color inválido', () => {
  const body = valido();
  body.despedida.mensaje = 'x'.repeat(4001);
  body.bienvenida.color = 'rojo';
  const { errores } = B.validar(body, ctx());
  assert.match(errores['despedida.mensaje'], /4000/);
  assert.match(errores['bienvenida.color'], /#RRGGBB/);
  body.bienvenida.color = null;
  assert.strictEqual(B.validar(body, ctx()).valores.bienvenida.color, '#9B59B6');
});

test('validar: cuerpo vacío deja todo desactivado', () => {
  const { valores, errores } = B.validar(null, ctx());
  assert.deepStrictEqual(errores, {});
  assert.strictEqual(valores.bienvenida.canal, null);
  assert.strictEqual(valores.verificacion.rolVerificado, null);
});

test('leer y guardar: usan las claves existentes de config', () => {
  const config = { welcomeChannel: 'c1', welcomeColor: 'Red', welcomeMessage: 'Hola', autoRole: 'r1', unverifiedRole: '', otra: 'x' };
  const seccion = B.leer({ config });
  assert.deepStrictEqual(seccion.bienvenida, { canal: 'c1', mensaje: 'Hola', color: '#ED4245' });
  assert.strictEqual(seccion.despedida.color, '#2C3E50');
  assert.strictEqual(seccion.verificacion.rolSinVerificar, null);

  const { config: nuevo } = B.guardar(B.validar(valido(), ctx()).valores, { config });
  assert.strictEqual(nuevo.welcomeChannel, 'c-general');
  assert.strictEqual(nuevo.welcomeMessage, 'Hola {user}');
  assert.strictEqual(nuevo.goodbyeChannel, null);
  assert.strictEqual(nuevo.autoRole, 'r-miembro');
  assert.strictEqual(nuevo.rulesChannel, 'c-anuncios');
  assert.strictEqual(nuevo.otra, 'x');
  assert.strictEqual(config.welcomeChannel, 'c1', 'no modifica el original');
});
