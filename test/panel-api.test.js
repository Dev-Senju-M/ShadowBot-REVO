// Servidor web del panel con un bot falso (src/web/server.js). No toca Discord ni la base.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { ChannelType, PermissionFlagsBits, Collection } = require('discord.js');
const store = require('../src/utils/db');
const { crearValor } = require('../src/web/sesion');
const { crearApp } = require('../src/web/server');
const { MODELOS_VALIDOS } = require('../src/utils/ai');

const SECRETO = 'secreto-de-prueba';
const almacenes = {
  config: { welcomeChannel: 'c-general', welcomeColor: 'Red' },
  personalidad: {},
  cumpleanos: { canal: null, usuarios: { u9: { dia: 1, mes: 1, anio: 2000, tag: 'nueve' } } },
};
store.get = (nombre) => JSON.parse(JSON.stringify(almacenes[nombre] ?? {}));
store.set = (nombre, datos) => { almacenes[nombre] = JSON.parse(JSON.stringify(datos)); };
delete process.env.PANEL_GUILD_ID;

const miembro = (id, ...permisos) => ({ id, displayName: id, permissions: { has: (p) => permisos.includes(p) } });
const guild = {
  id: 'g1', name: 'Santuario', memberCount: 42, iconURL: () => null,
  channels: { cache: new Collection([['c-general', { id: 'c-general', name: 'general', type: ChannelType.GuildText, position: 0, parent: null, permissionsFor: () => ({ has: () => true }), send: async () => {} }]]) },
  roles: { cache: new Collection([
    ['g1', { id: 'g1', name: '@everyone', position: 0, managed: false, hexColor: '#000000' }],
    ['r-miembro', { id: 'r-miembro', name: 'Miembro', position: 2, managed: false, hexColor: '#8b3dff' }],
  ]) },
  members: {
    me: { roles: { highest: { position: 5 } } },
    cache: new Collection([['u-admin', miembro('u-admin', PermissionFlagsBits.ManageGuild)], ['u-normal', miembro('u-normal')]]),
    fetch: async () => { throw new Error('desconocido'); },
  },
};
let listo = true;
const client = { isReady: () => listo, user: { tag: 'ShadowBot#0001' }, guilds: { cache: new Collection([['g1', guild]]) } };
const usuarios = { admin: { id: 'u-admin', username: 'admin', avatar: null }, normal: { id: 'u-normal', username: 'normal', avatar: null } };
const cfg = {
  clientId: '123', clientSecret: 'x', panelUrl: 'http://localhost', secreto: SECRETO,
  obtenerUsuario: async (code) => { if (!usuarios[code]) throw new Error('code inválido'); return usuarios[code]; },
};

let servidor;
let base;
before(async () => {
  servidor = crearApp(client, { cfg }).listen(0);
  await new Promise(resolve => servidor.once('listening', resolve));
  base = `http://127.0.0.1:${servidor.address().port}`;
});
after(() => servidor.close());

const cookie = (id) => `sb_sesion=${crearValor({ id, nombre: id, avatar: null }, SECRETO)}`;
function pedir(ruta, { metodo = 'GET', usuario, cuerpo, panel = true, cookies } = {}) {
  const headers = {};
  if (usuario) headers.Cookie = cookie(usuario);
  if (cookies) headers.Cookie = cookies;
  if (panel) headers['X-ShadowBot-Panel'] = '1';
  if (cuerpo !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(base + ruta, { method: metodo, redirect: 'manual', headers, body: cuerpo === undefined ? undefined : (typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo)) });
}
const seccionValida = () => ({
  bienvenida: { canal: 'c-general', mensaje: 'Hola {user}', color: '#123456' },
  despedida: { canal: null, mensaje: null, color: '#2C3E50' },
  verificacion: { rolVerificado: 'r-miembro', rolSinVerificar: null, canalReglas: 'c-general' },
});

test('/health responde como antes y con CORS abierto', async () => {
  const r = await pedir('/health', { panel: false });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.headers.get('access-control-allow-origin'), '*');
  const datos = await r.json();
  assert.strictEqual(datos.status, 'online');
  assert.strictEqual(datos.tag, 'ShadowBot#0001');
});

test('/api/tema es pública', async () => {
  const r = await pedir('/api/tema', { panel: false });
  assert.strictEqual(r.status, 200);
  assert.ok(['normal', 'halloween', 'navidad'].includes((await r.json()).temporada));
});

test('sin sesión → 401; sin permisos → 403', async () => {
  assert.strictEqual((await pedir('/api/me')).status, 401);
  assert.strictEqual((await pedir('/api/me', { cookies: 'sb_sesion=falsa.firma' })).status, 401);
  assert.strictEqual((await pedir('/api/me', { usuario: 'u-normal' })).status, 403);
  assert.strictEqual((await pedir('/api/me', { usuario: 'u-desconocido' })).status, 403);
});

test('admin: /api/me y /api/guild', async () => {
  const me = await (await pedir('/api/me', { usuario: 'u-admin' })).json();
  assert.strictEqual(me.usuario.id, 'u-admin');
  assert.strictEqual(me.servidor.nombre, 'Santuario');
  const datos = await (await pedir('/api/guild', { usuario: 'u-admin' })).json();
  assert.deepStrictEqual(datos.canales, [{ id: 'c-general', nombre: 'general', categoria: null }]);
  assert.deepStrictEqual(datos.roles, [{ id: 'r-miembro', nombre: 'Miembro', color: '#8b3dff', asignable: true }]);
});

test('GET bienvenida normaliza el color guardado por nombre', async () => {
  const datos = await (await pedir('/api/config/bienvenida', { usuario: 'u-admin' })).json();
  assert.strictEqual(datos.bienvenida.color, '#ED4245');
});

test('secciones y acciones inexistentes o del prototipo → 404', async () => {
  for (const nombre of ['nada', '__proto__', 'constructor', 'toString']) {
    assert.strictEqual((await pedir(`/api/config/${nombre}`, { usuario: 'u-admin' })).status, 404, nombre);
  }
  for (const accion of ['nada', '__proto__', 'constructor']) {
    assert.strictEqual((await pedir(`/api/config/ia/${accion}`, { metodo: 'POST', usuario: 'u-admin', cuerpo: {} })).status, 404, accion);
  }
});

test('PUT y acciones sin el encabezado del panel → 403', async () => {
  assert.strictEqual((await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', panel: false, cuerpo: seccionValida() })).status, 403);
  assert.strictEqual((await pedir('/api/config/ia/restablecer', { metodo: 'POST', usuario: 'u-admin', panel: false, cuerpo: {} })).status, 403);
  assert.strictEqual(almacenes.config.autoRole, undefined);
});

test('PUT inválido → 400 con errores por campo', async () => {
  const body = seccionValida();
  body.bienvenida.canal = 'c-no-existe';
  const r = await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', cuerpo: body });
  assert.strictEqual(r.status, 400);
  assert.ok((await r.json()).errores['bienvenida.canal']);
});

test('JSON mal formado → 400', async () => {
  assert.strictEqual((await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', cuerpo: '{malo' })).status, 400);
});

test('PUT válido guarda en la config del bot', async () => {
  const r = await pedir('/api/config/bienvenida', { metodo: 'PUT', usuario: 'u-admin', cuerpo: seccionValida() });
  assert.strictEqual(r.status, 200);
  assert.strictEqual((await r.json()).bienvenida.color, '#123456');
  assert.strictEqual(almacenes.config.autoRole, 'r-miembro');
});

test('PUT de IA guarda en su propio almacén', async () => {
  const cuerpo = { nombre: 'Sombra', personalidad: 'Habla bajito.', modelo: MODELOS_VALIDOS.potente, activada: false };
  const r = await pedir('/api/config/ia', { metodo: 'PUT', usuario: 'u-admin', cuerpo });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(almacenes.personalidad.nombre, 'Sombra');
  assert.strictEqual(almacenes.config.nombre, undefined, 'no toca config');
});

test('acciones: borrar cumpleaños y restablecer IA', async () => {
  const r = await pedir('/api/config/cumpleanos/borrar', { metodo: 'POST', usuario: 'u-admin', cuerpo: { usuarioId: 'u9' } });
  assert.strictEqual(r.status, 200);
  const datos = await r.json();
  assert.match(datos.mensaje, /nueve/);
  assert.deepStrictEqual(datos.seccion.lista, []);
  assert.deepStrictEqual(almacenes.cumpleanos.usuarios, {});
  const otra = await pedir('/api/config/cumpleanos/borrar', { metodo: 'POST', usuario: 'u-admin', cuerpo: { usuarioId: 'u9' } });
  assert.strictEqual(otra.status, 404);
  assert.match((await otra.json()).error, /ya no está registrado/);
  const ia = await pedir('/api/config/ia/restablecer', { metodo: 'POST', usuario: 'u-admin' });
  assert.strictEqual(ia.status, 200);
  assert.strictEqual(almacenes.personalidad.nombre, 'Shadow');
});

test('bot arrancando → 503', async () => {
  listo = false;
  try {
    assert.strictEqual((await pedir('/api/me', { usuario: 'u-admin' })).status, 503);
    assert.strictEqual((await (await pedir('/health', { panel: false })).json()).status, 'starting');
  } finally {
    listo = true;
  }
});

test('encabezados de seguridad', async () => {
  const r = await pedir('/api/tema');
  assert.match(r.headers.get('content-security-policy'), /default-src 'self'/);
  assert.strictEqual(r.headers.get('x-frame-options'), 'DENY');
});

test('/panel: sin sesión va al login; con sesión sirve el panel', async () => {
  const sin = await pedir('/panel/', { panel: false });
  assert.strictEqual(sin.status, 302);
  assert.strictEqual(sin.headers.get('location'), '/panel/login.html');
  const con = await pedir('/panel/', { usuario: 'u-admin', panel: false });
  assert.strictEqual(con.status, 200);
  assert.match(await con.text(), /ShadowBot/);
});

test('login con Discord: state, acceso y cookie de sesión', async () => {
  const login = await pedir('/auth/login', { panel: false });
  const destino = new URL(login.headers.get('location'));
  assert.strictEqual(destino.searchParams.get('scope'), 'identify');
  const state = destino.searchParams.get('state');
  const cookieEstado = login.headers.get('set-cookie').split(';')[0];
  assert.strictEqual((await pedir('/auth/callback?code=admin&state=otro', { panel: false, cookies: cookieEstado })).headers.get('location'), '/panel/login.html?error=estado');
  assert.strictEqual((await pedir(`/auth/callback?code=normal&state=${state}`, { panel: false, cookies: cookieEstado })).headers.get('location'), '/panel/login.html?error=acceso');
  const ok = await pedir(`/auth/callback?code=admin&state=${state}`, { panel: false, cookies: cookieEstado });
  assert.strictEqual(ok.headers.get('location'), '/panel/');
  assert.match(ok.headers.get('set-cookie'), /sb_sesion=.+HttpOnly/i);
});

test('logout exige el encabezado del panel', async () => {
  assert.strictEqual((await pedir('/auth/logout', { metodo: 'POST', panel: false })).status, 403);
  const r = await pedir('/auth/logout', { metodo: 'POST' });
  assert.strictEqual(r.status, 204);
});
