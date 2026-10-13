// Secciones Logs, Novedades, Fortnite, Cumpleaños e IA del panel (sin red ni base)
const { test } = require('node:test');
const assert = require('node:assert');
const { ChannelType } = require('discord.js');
const N = require('../src/utils/novedades');
const shop = require('../src/utils/fortnite-shop');
const { DEFAULT_PERSONALIDAD, MODELOS_VALIDOS } = require('../src/utils/ai');
const { ErrorAccion } = require('../src/web/secciones/comun');
const logs = require('../src/web/secciones/logs');
const novedades = require('../src/web/secciones/novedades');
const fortnite = require('../src/web/secciones/fortnite');
const cumpleanos = require('../src/web/secciones/cumpleanos');
const ia = require('../src/web/secciones/ia');

function guildFalso(enviados = []) {
  const canal = (id, falla = false) => [id, {
    id, type: ChannelType.GuildText,
    permissionsFor: () => ({ has: () => true }),
    send: async (mensaje) => { if (falla) throw new Error('sin permisos'); enviados.push({ id, mensaje }); },
  }];
  return {
    id: 'g1',
    channels: { cache: new Map([canal('c1'), canal('c2'), canal('c-roto', true)]) },
    roles: { cache: new Map([
      ['g1', { id: 'g1' }],
      ['r-ping', { id: 'r-ping', mentionable: true, managed: false, position: 9 }],
      ['r-mudo', { id: 'r-mudo', mentionable: false, managed: true, position: 9 }],
    ]) },
    members: { me: { roles: { highest: { position: 5 } } }, cache: new Map([['u1', { displayName: 'Ana' }]]) },
  };
}

async function rechaza(promesa, estado, texto) {
  await assert.rejects(promesa, (err) => {
    assert.ok(err instanceof ErrorAccion, `esperaba ErrorAccion, llegó ${err}`);
    assert.strictEqual(err.estado, estado);
    if (texto) assert.match(err.message, texto);
    return true;
  });
}

test('todas declaran almacenes y funciones del contrato', () => {
  for (const s of [logs, novedades, fortnite, cumpleanos, ia]) {
    assert.ok(Array.isArray(s.almacenes) && s.almacenes.length, s.titulo);
    for (const f of ['leer', 'validar', 'guardar']) assert.strictEqual(typeof s[f], 'function', `${s.titulo}.${f}`);
  }
});

test('logs: leer, validar y guardar', () => {
  const config = { modLogChannel: 'c1', otra: 1 };
  assert.deepStrictEqual(logs.leer({ config }), { moderacion: 'c1', actividad: null, seguridad: null });
  const { valores, errores } = logs.validar({ moderacion: 'c2', actividad: 'c-no', seguridad: '' }, { guild: guildFalso() });
  assert.match(errores.actividad, /canal de texto/);
  assert.deepStrictEqual(valores, { moderacion: 'c2', actividad: null, seguridad: null });
  const { config: nuevo } = logs.guardar({ moderacion: 'c2', actividad: 'c1', seguridad: null }, { config });
  assert.deepStrictEqual([nuevo.modLogChannel, nuevo.logsChannel, nuevo.securityLogChannel, nuevo.otra], ['c2', 'c1', null, 1]);
});

test('logs.probar: informa cada canal y falla sin canales', async () => {
  const enviados = [];
  const r = await logs.acciones.probar.ejecutar({}, { guild: guildFalso(enviados) }, { config: { modLogChannel: 'c1', securityLogChannel: 'c-roto' } });
  assert.match(r.mensaje, /✅ moderación/);
  assert.match(r.mensaje, /❌ seguridad/);
  assert.strictEqual(enviados.length, 1);
  await rechaza(logs.acciones.probar.ejecutar({}, { guild: guildFalso() }, { config: {} }), 400, /ningún canal/);
});

test('novedades: leer muestra el archivo y avisa de roles no mencionables', () => {
  const guild = guildFalso();
  const datos = novedades.leer({ config: { novedadesChannel: 'c1', novedadesRole: 'r-mudo', novedadesVersion: '0.9.0' } }, { guild });
  assert.strictEqual(datos.canal, 'c1');
  assert.strictEqual(datos.info.versionArchivo, N.leerVersiones()[0].version);
  assert.strictEqual(datos.info.ultimaAnunciada, '0.9.0');
  assert.match(datos.info.avisoRol, /no es mencionable/);
  assert.strictEqual(novedades.leer({ config: { novedadesRole: 'r-ping' } }, { guild }).info.avisoRol, null);
});

test('novedades: validar acepta roles no asignables pero no @everyone', () => {
  const guild = guildFalso();
  assert.deepStrictEqual(novedades.validar({ canal: 'c1', rol: 'r-mudo' }, { guild }), { valores: { canal: 'c1', rol: 'r-mudo' }, errores: {} });
  assert.match(novedades.validar({ canal: 'c1', rol: 'g1' }, { guild }).errores.rol, /no @everyone/);
  const { config } = novedades.guardar({ canal: 'c2', rol: null }, { config: { a: 1 } });
  assert.deepStrictEqual(config, { a: 1, novedadesChannel: 'c2', novedadesRole: null });
});

test('novedades.publicar: publica la versión más nueva y traduce los errores', async () => {
  const original = N.publicar;
  try {
    let publicadas = null;
    N.publicar = async (client, lista) => { publicadas = lista.map(v => v.version); };
    const r = await novedades.acciones.publicar.ejecutar({}, { client: {} }, { config: {} });
    assert.deepStrictEqual(publicadas, [N.leerVersiones()[0].version]);
    assert.match(r.mensaje, /Publicada la v/);
    N.publicar = async () => { throw new Error('No hay canal de novedades configurado.'); };
    await rechaza(novedades.acciones.publicar.ejecutar({}, { client: {} }, { config: {} }), 400, /canal de novedades/);
  } finally {
    N.publicar = original;
  }
});

test('fortnite: datos, falta de API key o canal, publicación y fallo de fnbr', async () => {
  const previo = process.env.FNBR_API_KEY;
  const { fetchShop, buildMessages } = shop;
  try {
    delete process.env.FNBR_API_KEY;
    assert.deepStrictEqual(fortnite.leer({ config: { fortniteShopChannel: 'c1', fortniteLastPosted: '2026-10-07' } }), { canal: 'c1', info: { apiKey: false, ultimaPublicacion: '2026-10-07' } });
    await rechaza(fortnite.acciones.publicar.ejecutar({}, { guild: guildFalso() }, { config: { fortniteShopChannel: 'c1' } }), 400, /FNBR_API_KEY/);

    process.env.FNBR_API_KEY = 'clave';
    await rechaza(fortnite.acciones.publicar.ejecutar({}, { guild: guildFalso() }, { config: {} }), 400, /canal/);

    const enviados = [];
    shop.fetchShop = async () => ({});
    shop.buildMessages = async () => [{ content: 'a' }, { content: 'b' }];
    const r = await fortnite.acciones.publicar.ejecutar({}, { guild: guildFalso(enviados) }, { config: { fortniteShopChannel: 'c1' } });
    assert.strictEqual(enviados.length, 2);
    assert.match(r.mensaje, /publicada/);

    shop.fetchShop = async () => { throw new Error('timeout'); };
    await rechaza(fortnite.acciones.publicar.ejecutar({}, { guild: guildFalso() }, { config: { fortniteShopChannel: 'c1' } }), 502, /timeout/);
  } finally {
    if (previo === undefined) delete process.env.FNBR_API_KEY; else process.env.FNBR_API_KEY = previo;
    Object.assign(shop, { fetchShop, buildMessages });
  }
});

test('cumpleanos: lista ordenada por el próximo cumpleaños (hora de Guatemala)', () => {
  const datos = { cumpleanos: { canal: 'c1', usuarios: {
    u1: { dia: 10, mes: 10, anio: 2000, tag: 'ana#0' },
    u2: { dia: 1, mes: 1, anio: 1995, tag: 'beto' },
    u3: { dia: 7, mes: 10, tag: 'caro' },
  } } };
  const { canal, lista } = cumpleanos.leer(datos, { guild: guildFalso() }, new Date('2026-10-07T18:00:00Z'));
  assert.strictEqual(canal, 'c1');
  assert.deepStrictEqual(lista.map(c => [c.id, c.nombre, c.faltan, c.cumple]), [
    ['u3', 'caro', 0, null],
    ['u1', 'Ana', 3, 26],
    ['u2', 'beto', 86, 32],
  ]);
});

test('cumpleanos: validar, guardar y borrar', async () => {
  const datos = { cumpleanos: { canal: null, usuarios: { u1: { dia: 1, mes: 2, tag: 'ana' } } } };
  assert.match(cumpleanos.validar({ canal: 'c-no' }, { guild: guildFalso() }).errores.canal, /canal de texto/);
  assert.deepStrictEqual(cumpleanos.guardar({ canal: 'c1' }, datos).cumpleanos.canal, 'c1');
  const r = await cumpleanos.acciones.borrar.ejecutar({ usuarioId: 'u1' }, { guild: guildFalso() }, datos);
  assert.deepStrictEqual(r.cambios.cumpleanos.usuarios, {});
  assert.match(r.mensaje, /Ana|ana/);
  await rechaza(cumpleanos.acciones.borrar.ejecutar({ usuarioId: 'u9' }, { guild: guildFalso() }, datos), 404);
  await rechaza(cumpleanos.acciones.borrar.ejecutar({ usuarioId: '__proto__' }, { guild: guildFalso() }, datos), 404);
});

test('ia: leer completa con los valores por defecto', () => {
  const datos = ia.leer({ personalidad: { nombre: 'Sombra' } });
  assert.strictEqual(datos.nombre, 'Sombra');
  assert.strictEqual(datos.personalidad, DEFAULT_PERSONALIDAD.personalidad);
  assert.strictEqual(datos.activada, true);
  assert.deepStrictEqual(datos.info.opcionesModelo.map(o => o.valor), Object.values(MODELOS_VALIDOS));
});

test('ia: validar, guardar y restablecer', async () => {
  const malo = ia.validar({ nombre: ' ', personalidad: 'x'.repeat(1501), modelo: 'gpt-x', activada: 'si' }, {});
  assert.deepStrictEqual(Object.keys(malo.errores).sort(), ['activada', 'modelo', 'nombre', 'personalidad']);
  const { valores, errores } = ia.validar({ nombre: ' Sombra ', personalidad: 'Habla bajito.', modelo: MODELOS_VALIDOS.potente, activada: false }, {});
  assert.deepStrictEqual(errores, {});
  assert.deepStrictEqual(valores, { nombre: 'Sombra', personalidad: 'Habla bajito.', modelo: MODELOS_VALIDOS.potente, activada: false });
  assert.deepStrictEqual(ia.guardar(valores, { personalidad: { extra: 1 } }).personalidad, { extra: 1, ...valores });
  const r = await ia.acciones.restablecer.ejecutar({}, {}, { personalidad: valores });
  assert.deepStrictEqual(r.cambios.personalidad, DEFAULT_PERSONALIDAD);
});
