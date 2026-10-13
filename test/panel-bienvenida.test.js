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

const valido = () => ({
  bienvenida: { canal: 'c-general', mensaje: '  Hola {user}  ', color: '#c0392b' },
  despedida: { canal: null, mensaje: '', color: '#2C3E50' },
  verificacion: { rolVerificado: 'r-miembro', rolSinVerificar: 'r-nuevo', canalReglas: 'c-anuncios' },
});

test('validar: datos correctos sin errores', () => {
  const { datos, errores } = B.validar(valido(), guildFalso());
  assert.deepStrictEqual(errores, {});
  assert.deepStrictEqual(datos.bienvenida, { canal: 'c-general', mensaje: 'Hola {user}', color: '#C0392B' });
  assert.deepStrictEqual(datos.despedida, { canal: null, mensaje: null, color: '#2C3E50' });
  assert.deepStrictEqual(datos.verificacion, { rolVerificado: 'r-miembro', rolSinVerificar: 'r-nuevo', canalReglas: 'c-anuncios' });
});

test('validar: canales inexistentes, de voz o sin permiso', () => {
  for (const [canal, texto] of [['c-no', /canal de texto/], ['c-voz', /canal de texto/], ['c-privado', /no puede escribir/], [123, /canal de texto/]]) {
    const body = valido();
    body.bienvenida.canal = canal;
    const { errores } = B.validar(body, guildFalso());
    assert.match(errores['bienvenida.canal'], texto, String(canal));
  }
});

test('validar: roles @everyone, gestionados, por encima del bot o repetidos', () => {
  const casos = [['g1', /no @everyone/], ['r-bot', /integración/], ['r-admin', /por encima/], ['r-no', /no @everyone/]];
  for (const [rol, texto] of casos) {
    const body = valido();
    body.verificacion.rolVerificado = rol;
    assert.match(B.validar(body, guildFalso()).errores['verificacion.rolVerificado'], texto, rol);
  }
  const body = valido();
  body.verificacion.rolSinVerificar = 'r-miembro';
  assert.match(B.validar(body, guildFalso()).errores['verificacion.rolSinVerificar'], /distinto/);
});

test('validar: mensaje demasiado largo y color inválido', () => {
  const body = valido();
  body.despedida.mensaje = 'x'.repeat(4001);
  body.bienvenida.color = 'rojo';
  const { errores, datos } = B.validar(body, guildFalso());
  assert.match(errores['despedida.mensaje'], /4000/);
  assert.match(errores['bienvenida.color'], /#RRGGBB/);
  body.bienvenida.color = null;
  assert.strictEqual(B.validar(body, guildFalso()).datos.bienvenida.color, '#9B59B6', 'sin color usa el por defecto');
  assert.ok(datos);
});

test('validar: cuerpo vacío deja todo desactivado', () => {
  const { datos, errores } = B.validar(null, guildFalso());
  assert.deepStrictEqual(errores, {});
  assert.strictEqual(datos.bienvenida.canal, null);
  assert.strictEqual(datos.verificacion.rolVerificado, null);
});

test('leer y guardar: usan las claves existentes de config', () => {
  const config = { welcomeChannel: 'c1', welcomeColor: 'Red', welcomeMessage: 'Hola', autoRole: 'r1', unverifiedRole: '', otra: 'x' };
  const seccion = B.leer(config);
  assert.deepStrictEqual(seccion.bienvenida, { canal: 'c1', mensaje: 'Hola', color: '#ED4245' });
  assert.strictEqual(seccion.despedida.color, '#2C3E50');
  assert.strictEqual(seccion.verificacion.rolSinVerificar, null);

  const nuevo = B.guardar(B.validar(valido(), guildFalso()).datos, config);
  assert.strictEqual(nuevo.welcomeChannel, 'c-general');
  assert.strictEqual(nuevo.welcomeMessage, 'Hola {user}');
  assert.strictEqual(nuevo.goodbyeChannel, null);
  assert.strictEqual(nuevo.autoRole, 'r-miembro');
  assert.strictEqual(nuevo.rulesChannel, 'c-anuncios');
  assert.strictEqual(nuevo.otra, 'x', 'conserva el resto de la config');
  assert.strictEqual(config.welcomeChannel, 'c1', 'no modifica el original');
});
