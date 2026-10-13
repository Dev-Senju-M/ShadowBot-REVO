# Panel — tanda A (formularios simples) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Secciones Logs, Novedades, Tienda Fortnite, Cumpleaños e IA en el panel, con un contrato de secciones generalizado (almacenes declarados y acciones).

**Architecture:** Las secciones del backend (`src/web/secciones/*.js`) son módulos puros con `almacenes`, `leer`, `validar`, `guardar` y `acciones`; `api.js` carga/guarda los almacenes y registra los cambios. En el frontend, `formulario.js` pinta formularios declarativos y `dialogo.js` confirma acciones.

**Tech Stack:** Node ≥ 22.12, CommonJS, discord.js v14, Express 5, `node:test`; frontend sin compilación.

**Spec:** `docs/superpowers/specs/2026-10-07-panel-secciones-tanda-a-design.md`

## Global Constraints

- Sin dependencias nuevas. CSP del panel sin estilos ni scripts en línea (los estilos nuevos van en `web/panel/componentes.css`).
- Mensajes de error iguales a los de Bienvenida para canales y roles.
- Una sección solo puede escribir en los almacenes que declara.
- Todo texto de usuario se escapa en el frontend (`Formato.escapar`); los diálogos usan `textContent`.
- Sin commits: al final de cada tarea `git add` de los archivos.

## Archivos

Los bloques `Archivo: \`ruta\`` se extraen con el mismo script `extraer.js` del plan del panel base.

| Archivo | Tarea |
|---|---|
| `src/web/secciones/comun.js`, `bienvenida.js` (reescrito), `test/panel-bienvenida.test.js` (reescrito) | 1 |
| `src/web/secciones/logs.js`, `novedades.js`, `fortnite.js`, `cumpleanos.js`, `ia.js`, `test/panel-secciones.test.js` | 2 |
| `src/web/api.js` (reescrito), `test/panel-api.test.js` (reescrito) | 3 |
| `web/panel/**` (nuevos y modificados) | 4 |

---

### Task 1: Validaciones compartidas y Bienvenida con el contrato nuevo

**Interfaces (Produces):** `comun`: `TIPOS_TEXTO`, `vacio(v)`, `ErrorAccion(mensaje, estado=400)`, `validarCanal(id, guild, errores, campo)`, `validarRol(id, guild, errores, campo, { asignable = true })`, `validarTexto(texto, errores, campo, { min = 0, max })`. Bienvenida: `{ titulo, almacenes: ['config'], leer({ config }), validar(body, { guild }) → { valores, errores }, guardar(valores, { config }) → { config } }`.

- [ ] **Step 1: Test reescrito (falla con la firma vieja)**

Archivo: `test/panel-bienvenida.test.js`

```js
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
```

- [ ] **Step 2:** `node --test test/panel-bienvenida.test.js` → FAIL (la firma vieja no tiene `almacenes` ni `valores`).

- [ ] **Step 3: Implementación**

Archivo: `src/web/secciones/comun.js`

```js
// Validaciones compartidas por las secciones del panel. Cada función devuelve el
// valor limpio (o null) y anota el problema en errores[campo].
const { ChannelType, PermissionFlagsBits } = require('discord.js');

const TIPOS_TEXTO = [ChannelType.GuildText, ChannelType.GuildAnnouncement];
const vacio = (v) => v === null || v === undefined || v === '';

// Error de una acción, con mensaje para el usuario y código HTTP
class ErrorAccion extends Error {
  constructor(mensaje, estado = 400) {
    super(mensaje);
    this.estado = estado;
  }
}

function validarCanal(id, guild, errores, campo) {
  if (vacio(id)) return null;
  const canal = typeof id === 'string' ? guild.channels.cache.get(id) : null;
  if (!canal || !TIPOS_TEXTO.includes(canal.type)) {
    errores[campo] = 'Elige un canal de texto del servidor.';
    return null;
  }
  const permisos = canal.permissionsFor(guild.members.me);
  if (!permisos?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
    errores[campo] = 'El bot no puede escribir en ese canal.';
    return null;
  }
  return canal.id;
}

// asignable: false para roles que solo se mencionan (no hace falta que el bot pueda darlos)
function validarRol(id, guild, errores, campo, { asignable = true } = {}) {
  if (vacio(id)) return null;
  const rol = typeof id === 'string' ? guild.roles.cache.get(id) : null;
  if (!rol || rol.id === guild.id) {
    errores[campo] = 'Elige un rol del servidor (no @everyone).';
    return null;
  }
  if (asignable && rol.managed) {
    errores[campo] = 'Ese rol lo gestiona una integración; el bot no puede asignarlo.';
    return null;
  }
  if (asignable && rol.position >= guild.members.me.roles.highest.position) {
    errores[campo] = 'Ese rol está por encima del rol del bot: súbelo en Ajustes del servidor o elige otro.';
    return null;
  }
  return rol.id;
}

function validarTexto(texto, errores, campo, { min = 0, max }) {
  if (vacio(texto) || (typeof texto === 'string' && !texto.trim())) {
    if (min > 0) errores[campo] = 'Este campo no puede quedar vacío.';
    return null;
  }
  if (typeof texto !== 'string') {
    errores[campo] = 'Texto inválido.';
    return null;
  }
  const limpio = texto.trim();
  if (limpio.length < min) {
    errores[campo] = `Mínimo ${min} caracteres.`;
    return null;
  }
  if (limpio.length > max) {
    errores[campo] = `Máximo ${max} caracteres.`;
    return null;
  }
  return limpio;
}

module.exports = { TIPOS_TEXTO, vacio, ErrorAccion, validarCanal, validarRol, validarTexto };
```

Archivo: `src/web/secciones/bienvenida.js`

```js
// Sección "bienvenida" del panel: bienvenida, despedida y verificación.
// Usa las mismas claves de config que leen events/welcome.js y events/verify.js,
// así que los cambios se aplican al instante.
const { HEX, normalizarColor } = require('../colores');
const { vacio, validarCanal, validarRol, validarTexto } = require('./comun');

const titulo = 'Bienvenida';
const almacenes = ['config'];
const MAX_MENSAJE = 4000;
const COLOR_BIENVENIDA = '#9B59B6'; // los mismos por defecto que events/welcome.js
const COLOR_DESPEDIDA = '#2C3E50';

function leer({ config }) {
  return {
    bienvenida: {
      canal: config.welcomeChannel || null,
      mensaje: config.welcomeMessage || null,
      color: normalizarColor(config.welcomeColor, COLOR_BIENVENIDA),
    },
    despedida: {
      canal: config.goodbyeChannel || null,
      mensaje: config.goodbyeMessage || null,
      color: normalizarColor(config.goodbyeColor, COLOR_DESPEDIDA),
    },
    verificacion: {
      rolVerificado: config.autoRole || null,
      rolSinVerificar: config.unverifiedRole || null,
      canalReglas: config.rulesChannel || null,
    },
  };
}

function validarColor(color, errores, campo, porDefecto) {
  if (vacio(color)) return porDefecto;
  if (typeof color !== 'string' || !HEX.test(color)) {
    errores[campo] = 'Usa un color en formato #RRGGBB.';
    return porDefecto;
  }
  return color.toUpperCase();
}

function validar(body, { guild }) {
  const errores = {};
  const b = body?.bienvenida ?? {};
  const d = body?.despedida ?? {};
  const v = body?.verificacion ?? {};
  const valores = {
    bienvenida: {
      canal: validarCanal(b.canal, guild, errores, 'bienvenida.canal'),
      mensaje: validarTexto(b.mensaje, errores, 'bienvenida.mensaje', { max: MAX_MENSAJE }),
      color: validarColor(b.color, errores, 'bienvenida.color', COLOR_BIENVENIDA),
    },
    despedida: {
      canal: validarCanal(d.canal, guild, errores, 'despedida.canal'),
      mensaje: validarTexto(d.mensaje, errores, 'despedida.mensaje', { max: MAX_MENSAJE }),
      color: validarColor(d.color, errores, 'despedida.color', COLOR_DESPEDIDA),
    },
    verificacion: {
      rolVerificado: validarRol(v.rolVerificado, guild, errores, 'verificacion.rolVerificado'),
      rolSinVerificar: validarRol(v.rolSinVerificar, guild, errores, 'verificacion.rolSinVerificar'),
      canalReglas: validarCanal(v.canalReglas, guild, errores, 'verificacion.canalReglas'),
    },
  };
  const { rolVerificado, rolSinVerificar } = valores.verificacion;
  if (rolVerificado && rolVerificado === rolSinVerificar) {
    errores['verificacion.rolSinVerificar'] = 'Debe ser distinto del rol verificado.';
  }
  return { valores, errores };
}

function guardar(valores, { config }) {
  return {
    config: {
      ...config,
      welcomeChannel: valores.bienvenida.canal,
      welcomeMessage: valores.bienvenida.mensaje,
      welcomeColor: valores.bienvenida.color,
      goodbyeChannel: valores.despedida.canal,
      goodbyeMessage: valores.despedida.mensaje,
      goodbyeColor: valores.despedida.color,
      autoRole: valores.verificacion.rolVerificado,
      unverifiedRole: valores.verificacion.rolSinVerificar,
      rulesChannel: valores.verificacion.canalReglas,
    },
  };
}

module.exports = { titulo, almacenes, leer, validar, guardar };
```

- [ ] **Step 4:** `node --test test/panel-bienvenida.test.js` → PASS (7 tests). (`panel-api` fallará hasta la Tarea 3.)
- [ ] **Step 5:** `git add src/web/secciones test/panel-bienvenida.test.js`

---

### Task 2: Secciones Logs, Novedades, Fortnite, Cumpleaños e IA

**Interfaces:** cada una exporta `{ titulo, almacenes, leer, validar, guardar, acciones }` (contrato de la Tarea 1). Acciones: `logs.probar`, `novedades.publicar`, `fortnite.publicar`, `cumpleanos.borrar({ usuarioId })`, `ia.restablecer`.

- [ ] **Step 1: Test que falla**

Archivo: `test/panel-secciones.test.js`

```js
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
```

- [ ] **Step 2:** `node --test test/panel-secciones.test.js` → FAIL (`Cannot find module`).

- [ ] **Step 3: Implementación**

Archivo: `src/web/secciones/logs.js`

```js
// Sección "logs": canales de moderación, actividad y seguridad.
const { EmbedBuilder } = require('discord.js');
const { ErrorAccion, validarCanal } = require('./comun');

const titulo = 'Logs';
const almacenes = ['config'];
const CLAVES = { moderacion: 'modLogChannel', actividad: 'logsChannel', seguridad: 'securityLogChannel' };
const NOMBRES = { moderacion: 'moderación', actividad: 'actividad', seguridad: 'seguridad' };

function leer({ config }) {
  return Object.fromEntries(Object.entries(CLAVES).map(([campo, clave]) => [campo, config[clave] || null]));
}

function validar(body, { guild }) {
  const errores = {};
  const valores = Object.fromEntries(Object.keys(CLAVES).map(campo => [campo, validarCanal(body?.[campo], guild, errores, campo)]));
  return { valores, errores };
}

function guardar(valores, { config }) {
  const nuevo = { ...config };
  for (const [campo, clave] of Object.entries(CLAVES)) nuevo[clave] = valores[campo];
  return { config: nuevo };
}

const acciones = {
  probar: {
    titulo: 'Enviar prueba',
    async ejecutar(body, { guild }, { config }) {
      const resultados = [];
      for (const [campo, id] of Object.entries(leer({ config }))) {
        if (!id) continue;
        const canal = guild.channels.cache.get(id);
        const embed = new EmbedBuilder()
          .setColor('#8B3DFF')
          .setTitle('🧪 Prueba de logs')
          .setDescription(`Este canal recibirá los logs de **${NOMBRES[campo]}**.`)
          .setTimestamp();
        const ok = canal ? await canal.send({ embeds: [embed] }).then(() => true, () => false) : false;
        resultados.push(`${ok ? '✅' : '❌'} ${NOMBRES[campo]}`);
      }
      if (!resultados.length) throw new ErrorAccion('No hay ningún canal de logs configurado.');
      return { mensaje: `Prueba enviada: ${resultados.join(' · ')}` };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
```

Archivo: `src/web/secciones/novedades.js`

```js
// Sección "novedades": canal y rol de los anuncios de versiones (NOVEDADES.md).
const { PermissionFlagsBits } = require('discord.js');
const N = require('../../utils/novedades');
const { ErrorAccion, validarCanal, validarRol } = require('./comun');

const titulo = 'Novedades';
const almacenes = ['config'];

function avisoRol(rolId, guild) {
  const rol = rolId && guild?.roles.cache.get(rolId);
  if (!rol || rol.mentionable || guild.members.me.permissions?.has(PermissionFlagsBits.MentionEveryone)) return null;
  return 'Ese rol no es mencionable y el bot no tiene "Mencionar a todos": el anuncio no le avisará.';
}

function leer({ config }, { guild } = {}) {
  const [ultima] = N.leerVersiones();
  return {
    canal: config.novedadesChannel || null,
    rol: config.novedadesRole || null,
    info: {
      versionArchivo: ultima?.version ?? null,
      fechaArchivo: ultima?.fecha ?? null,
      textoArchivo: ultima?.texto ?? null,
      ultimaAnunciada: config.novedadesVersion ?? null,
      automatico: process.env.ANUNCIAR_NOVEDADES === 'true',
      avisoRol: avisoRol(config.novedadesRole, guild),
    },
  };
}

function validar(body, { guild }) {
  const errores = {};
  const valores = {
    canal: validarCanal(body?.canal, guild, errores, 'canal'),
    rol: validarRol(body?.rol, guild, errores, 'rol', { asignable: false }),
  };
  return { valores, errores };
}

function guardar(valores, { config }) {
  return { config: { ...config, novedadesChannel: valores.canal, novedadesRole: valores.rol } };
}

const acciones = {
  publicar: {
    titulo: 'Publicar ahora',
    async ejecutar(body, { client }) {
      const [ultima] = N.leerVersiones();
      if (!ultima) throw new ErrorAccion('No hay versiones en NOVEDADES.md.');
      try {
        await N.publicar(client, [ultima]);
      } catch (err) {
        throw new ErrorAccion(err.message);
      }
      return { mensaje: `Publicada la v${ultima.version} en el canal de novedades.` };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
```

Archivo: `src/web/secciones/fortnite.js`

```js
// Sección "fortnite": canal de la tienda diaria y publicación manual.
const shop = require('../../utils/fortnite-shop');
const { ErrorAccion, validarCanal } = require('./comun');

const titulo = 'Tienda Fortnite';
const almacenes = ['config'];

function leer({ config }) {
  return {
    canal: config.fortniteShopChannel || null,
    info: { apiKey: Boolean(process.env.FNBR_API_KEY), ultimaPublicacion: config.fortniteLastPosted ?? null },
  };
}

function validar(body, { guild }) {
  const errores = {};
  return { valores: { canal: validarCanal(body?.canal, guild, errores, 'canal') }, errores };
}

function guardar(valores, { config }) {
  return { config: { ...config, fortniteShopChannel: valores.canal } };
}

const acciones = {
  publicar: {
    titulo: 'Publicar ahora',
    async ejecutar(body, { guild }, { config }) {
      if (!process.env.FNBR_API_KEY) throw new ErrorAccion('Falta FNBR_API_KEY en las variables del bot.');
      if (!config.fortniteShopChannel) throw new ErrorAccion('Elige y guarda primero el canal de la tienda.');
      const canal = guild.channels.cache.get(config.fortniteShopChannel);
      if (!canal) throw new ErrorAccion('El canal de la tienda ya no existe.');
      let mensajes;
      try {
        mensajes = await shop.buildMessages(await shop.fetchShop());
      } catch (err) {
        throw new ErrorAccion(`No se pudo obtener la tienda: ${err.message}`, 502);
      }
      for (const mensaje of mensajes) await canal.send(mensaje);
      return { mensaje: 'Tienda de Fortnite publicada.' };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
```

Archivo: `src/web/secciones/cumpleanos.js`

```js
// Sección "cumpleanos": canal de anuncios y lista de cumpleaños registrados.
const { ErrorAccion, validarCanal } = require('./comun');

const titulo = 'Cumpleaños';
const almacenes = ['cumpleanos'];
const DIA_MS = 24 * 60 * 60 * 1000;

function hoyGuatemala(fecha) {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Guatemala', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(fecha);
  const valor = (tipo) => Number(partes.find(p => p.type === tipo).value);
  return { anio: valor('year'), mes: valor('month'), dia: valor('day') };
}

// Días hasta el próximo cumpleaños y año en que cae
function proximo(dia, mes, hoy) {
  const base = Date.UTC(hoy.anio, hoy.mes - 1, hoy.dia);
  let anio = hoy.anio;
  if (Date.UTC(anio, mes - 1, dia) < base) anio++;
  return { faltan: Math.round((Date.UTC(anio, mes - 1, dia) - base) / DIA_MS), anio };
}

function nombreDe(id, usuario, guild) {
  return guild?.members.cache.get(id)?.displayName || usuario.tag || id;
}

function leer({ cumpleanos }, { guild } = {}, ahora = new Date()) {
  const hoy = hoyGuatemala(ahora);
  const lista = Object.entries(cumpleanos.usuarios || {})
    .map(([id, u]) => {
      const { faltan, anio } = proximo(u.dia, u.mes, hoy);
      return { id, nombre: nombreDe(id, u, guild), dia: u.dia, mes: u.mes, faltan, cumple: u.anio ? anio - u.anio : null };
    })
    .sort((a, b) => a.faltan - b.faltan || a.nombre.localeCompare(b.nombre));
  return { canal: cumpleanos.canal || null, lista };
}

function validar(body, { guild }) {
  const errores = {};
  return { valores: { canal: validarCanal(body?.canal, guild, errores, 'canal') }, errores };
}

function guardar(valores, { cumpleanos }) {
  return { cumpleanos: { ...cumpleanos, canal: valores.canal } };
}

const acciones = {
  borrar: {
    titulo: 'Borrar cumpleaños',
    async ejecutar(body, { guild }, { cumpleanos }) {
      const usuarios = cumpleanos.usuarios || {};
      const id = body?.usuarioId;
      if (typeof id !== 'string' || !Object.hasOwn(usuarios, id)) {
        throw new ErrorAccion('Ese cumpleaños ya no está registrado.', 404);
      }
      const nombre = nombreDe(id, usuarios[id], guild);
      const { [id]: _borrado, ...resto } = usuarios;
      return { mensaje: `Se borró el cumpleaños de ${nombre}.`, cambios: { cumpleanos: { ...cumpleanos, usuarios: resto } } };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
```

Archivo: `src/web/secciones/ia.js`

```js
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
```

- [ ] **Step 4:** `node --test test/panel-secciones.test.js` → PASS (11 tests).
- [ ] **Step 5:** `git add src/web/secciones test/panel-secciones.test.js`

---

### Task 3: API con almacenes declarados y acciones

- [ ] **Step 1: Test reescrito**

Archivo: `test/panel-api.test.js`

```js
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
```

- [ ] **Step 2:** `node --test test/panel-api.test.js` → FAIL (ruta de acciones y secciones nuevas no existen).

- [ ] **Step 3: Implementación**

Archivo: `src/web/api.js`

```js
// API del panel. Todo salvo /tema exige sesión válida y ser admin en vivo;
// los métodos que modifican exigen además el encabezado del panel (anti-CSRF).
const express = require('express');
const { ChannelType, EmbedBuilder } = require('discord.js');
const store = require('../utils/db');
const { sendSecurityLog } = require('../utils/modlog');
const { leerValor, leerCookie } = require('./sesion');
const { esAdmin, servidorPanel, miembroDe } = require('./permisos');
const { temporadaActual } = require('./temporadas');
const { ErrorAccion } = require('./secciones/comun');

// Cada sección declara sus almacenes, leer/validar/guardar y sus acciones
const SECCIONES = new Map(['bienvenida', 'logs', 'novedades', 'fortnite', 'cumpleanos', 'ia']
  .map(nombre => [nombre, require(`./secciones/${nombre}`)]));
const METODOS_LECTURA = ['GET', 'HEAD'];

function avatarUrl(id, avatar) {
  if (avatar) return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;
  return `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(id.replace(/\D/g, '') || '0') >> 22n) % 6n)}.png`;
}

// Lista "campo → valor" de un objeto anidado
function aplanar(objeto, prefijo = '') {
  return Object.entries(objeto).flatMap(([clave, valor]) => (valor && typeof valor === 'object'
    ? aplanar(valor, `${prefijo}${clave}.`)
    : [[`${prefijo}${clave}`, valor]]));
}

function diferencias(antes, despues) {
  const previo = new Map(aplanar(antes));
  return aplanar(despues)
    .filter(([campo, valor]) => previo.get(campo) !== valor)
    .map(([campo, valor]) => ({ campo, antes: previo.get(campo), despues: valor }));
}

const recortar = (v) => (v === null || v === undefined ? '—' : String(v).slice(0, 80));

// Datos de los almacenes que declara la sección
function cargar(seccion) {
  return Object.fromEntries(seccion.almacenes.map(nombre => [nombre, store.get(nombre)]));
}

// Guarda solo los almacenes que la sección declaró
function aplicar(seccion, cambios = {}) {
  for (const [nombre, valor] of Object.entries(cambios)) {
    if (!seccion.almacenes.includes(nombre)) throw new Error(`La sección ${seccion.titulo} intentó escribir en "${nombre}"`);
    store.set(nombre, valor);
  }
}

async function registrar(guild, usuarioId, titulo, campos) {
  if (!campos.length) return;
  const embed = new EmbedBuilder()
    .setColor('#8B3DFF')
    .setTitle(`📝 ${titulo}`)
    .setDescription(`Por <@${usuarioId}> desde el panel`)
    .addFields(campos.slice(0, 20))
    .setTimestamp();
  await sendSecurityLog(guild, embed);
}
const alFallarRegistro = (err) => console.error('[panel] No se pudo registrar el cambio:', err.message);

function rutasApi(client, cfg) {
  const router = express.Router();
  router.use(express.json({ limit: '32kb' }));

  router.get('/tema', (req, res) => res.json({ temporada: temporadaActual() }));

  router.use(async (req, res, next) => {
    try {
      const sesion = leerValor(leerCookie(req, 'sb_sesion'), cfg.secreto);
      if (!sesion) return res.status(401).json({ error: 'Inicia sesión.' });
      if (!client.isReady()) return res.status(503).json({ error: 'El bot está arrancando.' });
      const guild = servidorPanel(client);
      if (!guild) return res.status(503).json({ error: 'No encuentro el servidor del panel (revisa PANEL_GUILD_ID).' });
      const miembro = await miembroDe(guild, sesion.id);
      if (!esAdmin(miembro)) return res.status(403).json({ error: 'No tienes acceso.' });
      if (!METODOS_LECTURA.includes(req.method) && req.get('x-shadowbot-panel') !== '1') {
        return res.status(403).json({ error: 'Petición no permitida.' });
      }
      req.sesion = sesion;
      req.guild = guild;
      next();
    } catch (err) {
      next(err);
    }
  });

  const contexto = (req) => ({ guild: req.guild, client });
  function buscarSeccion(req, res) {
    const seccion = SECCIONES.get(req.params.seccion);
    if (!seccion) res.status(404).json({ error: 'Sección desconocida.' });
    return seccion;
  }

  router.get('/me', (req, res) => {
    const { sesion, guild } = req;
    res.json({
      usuario: { id: sesion.id, nombre: sesion.nombre, avatarUrl: avatarUrl(sesion.id, sesion.avatar) },
      servidor: { id: guild.id, nombre: guild.name, iconoUrl: guild.iconURL({ size: 128 }), miembros: guild.memberCount },
      temporada: temporadaActual(),
      bot: { enLinea: client.isReady(), uptime: Math.floor(process.uptime()), tag: client.user.tag },
    });
  });

  router.get('/guild', (req, res) => {
    const { guild } = req;
    const tope = guild.members.me.roles.highest.position;
    const canales = [...guild.channels.cache.values()]
      .filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)
      .sort((a, b) => (a.parent?.position ?? -1) - (b.parent?.position ?? -1) || a.position - b.position)
      .map(c => ({ id: c.id, nombre: c.name, categoria: c.parent?.name ?? null }));
    const roles = [...guild.roles.cache.values()]
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, nombre: r.name, color: r.hexColor, asignable: !r.managed && r.position < tope }));
    res.json({ canales, roles });
  });

  router.get('/config/:seccion', (req, res) => {
    const seccion = buscarSeccion(req, res);
    if (!seccion) return;
    res.json(seccion.leer(cargar(seccion), contexto(req)));
  });

  router.put('/config/:seccion', (req, res) => {
    const seccion = buscarSeccion(req, res);
    if (!seccion) return;
    const ctx = contexto(req);
    const { valores, errores } = seccion.validar(req.body, ctx);
    if (Object.keys(errores).length) return res.status(400).json({ errores });
    const antes = cargar(seccion);
    aplicar(seccion, seccion.guardar(valores, antes));
    const despues = seccion.leer(cargar(seccion), ctx);
    const campos = diferencias(seccion.leer(antes, ctx), despues)
      .map(c => ({ name: c.campo, value: `${recortar(c.antes)} → ${recortar(c.despues)}` }));
    registrar(req.guild, req.sesion.id, `${seccion.titulo}: cambios`, campos).catch(alFallarRegistro);
    res.json(despues);
  });

  router.post('/config/:seccion/:accion', async (req, res, next) => {
    const seccion = buscarSeccion(req, res);
    if (!seccion) return;
    const acciones = seccion.acciones ?? {};
    const accion = Object.hasOwn(acciones, req.params.accion) ? acciones[req.params.accion] : null;
    if (!accion) return res.status(404).json({ error: 'Acción desconocida.' });
    const ctx = contexto(req);
    try {
      const resultado = await accion.ejecutar(req.body ?? {}, ctx, cargar(seccion));
      aplicar(seccion, resultado.cambios);
      registrar(req.guild, req.sesion.id, `${seccion.titulo}: ${accion.titulo}`, [{ name: 'Resultado', value: String(resultado.mensaje).slice(0, 1000) }])
        .catch(alFallarRegistro);
      res.json({ mensaje: resultado.mensaje, seccion: seccion.leer(cargar(seccion), ctx) });
    } catch (err) {
      if (err instanceof ErrorAccion) return res.status(err.estado).json({ error: err.message });
      next(err);
    }
  });

  return router;
}

module.exports = { rutasApi, diferencias };
```

- [ ] **Step 4:** `node --test test/panel-api.test.js` → PASS (17 tests); `npm test` → PASS.
- [ ] **Step 5:** `git add src/web/api.js test/panel-api.test.js`

---

### Task 4: Frontend de las 5 secciones

- [ ] **Step 1: Archivos nuevos y modificados**

Archivo: `web/panel/js/dialogo.js`

```js
// Diálogo de confirmación del panel (<dialog> nativo con la mascota).
// Uso: if (await Dialogo.confirmar({ titulo, texto, boton, peligro })) { ... }
const Dialogo = (() => {
  function confirmar({ titulo, texto, boton = 'Confirmar', peligro = false }) {
    return new Promise((resolve) => {
      const dialogo = document.createElement('dialog');
      dialogo.className = 'dialogo';
      dialogo.innerHTML = `<div class="mascota" data-estado="${peligro ? 'triste' : 'hola'}"></div>
        <h2 class="titulo dialogo-titulo"></h2>
        <p class="dialogo-texto"></p>
        <div class="dialogo-botones">
          <button type="button" class="boton boton-fantasma" value="no">Cancelar</button>
          <button type="button" class="boton${peligro ? ' boton-peligro' : ''}" value="si"></button>
        </div>`;
      dialogo.querySelector('.dialogo-titulo').textContent = titulo;
      dialogo.querySelector('.dialogo-texto').textContent = texto;
      dialogo.querySelector('button[value="si"]').textContent = boton;
      document.body.append(dialogo);
      Mascota.pintar(dialogo);

      const cerrar = (valor) => {
        dialogo.close();
        dialogo.remove();
        resolve(valor);
      };
      dialogo.addEventListener('click', (evento) => {
        const elegido = evento.target.closest('button');
        if (elegido) cerrar(elegido.value === 'si');
        else if (evento.target === dialogo) cerrar(false);
      });
      dialogo.addEventListener('cancel', (evento) => {
        evento.preventDefault();
        cerrar(false);
      });
      dialogo.showModal();
      dialogo.querySelector('button[value="no"]').focus();
    });
  }

  return { confirmar };
})();
```

Archivo: `web/panel/js/formulario.js`

```js
// Motor de formularios del panel: cada sección declara sus campos y este
// archivo los pinta, detecta cambios, guarda, muestra errores y ejecuta acciones.
const Formulario = (() => {
  const esc = Formato.escapar;
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  function opcionesCanal(canales, valor) {
    const grupos = new Map();
    for (const canal of canales) {
      const grupo = canal.categoria || 'Sin categoría';
      if (!grupos.has(grupo)) grupos.set(grupo, []);
      grupos.get(grupo).push(canal);
    }
    let html = '<option value="">— Desactivado —</option>';
    for (const [grupo, lista] of grupos) {
      html += `<optgroup label="${esc(grupo)}">${lista.map(c => `<option value="${esc(c.id)}"${c.id === valor ? ' selected' : ''}># ${esc(c.nombre)}</option>`).join('')}</optgroup>`;
    }
    return html;
  }

  function opcionesRol(roles, valor, soloAsignables) {
    return '<option value="">— Ninguno —</option>' + roles.map(r => {
      const bloqueado = soloAsignables && !r.asignable && r.id !== valor;
      const nota = soloAsignables && !r.asignable ? ' (el bot no puede asignarlo)' : '';
      return `<option value="${esc(r.id)}"${r.id === valor ? ' selected' : ''}${bloqueado ? ' disabled' : ''}>@${esc(r.nombre)}${nota}</option>`;
    }).join('');
  }

  function control(campo, valor, guild, datos) {
    const atributos = `id="f-${campo.ruta}" data-campo="${campo.ruta}"`;
    switch (campo.tipo) {
      case 'canal': return `<select ${atributos}>${opcionesCanal(guild.canales, valor)}</select>`;
      case 'rol': return `<select ${atributos}>${opcionesRol(guild.roles, valor, campo.asignable !== false)}</select>`;
      case 'texto': return `<input type="text" ${atributos} maxlength="${campo.max}" value="${esc(valor ?? '')}">`;
      case 'area': return `<textarea ${atributos} rows="${campo.filas || 6}" maxlength="${campo.max}">${esc(valor ?? '')}</textarea>`;
      case 'opciones': {
        const opciones = typeof campo.opciones === 'function' ? campo.opciones(datos) : campo.opciones;
        return `<select ${atributos}>${opciones.map(o => `<option value="${esc(o.valor)}"${o.valor === valor ? ' selected' : ''}>${esc(o.nombre)}</option>`).join('')}</select>`;
      }
      default: return '';
    }
  }

  function campoHtml(campo, datos, guild) {
    const ayuda = campo.ayuda ? `<p class="ayuda">${campo.ayuda}</p>` : '';
    const error = `<p class="error-campo" data-error="${campo.ruta}" hidden></p>`;
    if (campo.tipo === 'interruptor') {
      return `<div class="campo"><label class="interruptor">
          <input type="checkbox" id="f-${campo.ruta}" data-campo="${campo.ruta}"${datos[campo.ruta] ? ' checked' : ''}>
          <span class="interruptor-pista" aria-hidden="true"></span><span>${esc(campo.etiqueta)}</span>
        </label>${ayuda}${error}</div>`;
    }
    const icono = campo.icono || { canal: 'canal', rol: 'rol' }[campo.tipo];
    return `<div class="campo">
        <label for="f-${campo.ruta}">${icono ? Iconos.svg(icono) : ''} ${esc(campo.etiqueta)}</label>
        ${control(campo, datos[campo.ruta], guild, datos)}${ayuda}${error}
      </div>`;
  }

  function valorDe(elemento) {
    if (elemento.type === 'checkbox') return elemento.checked;
    if (elemento.tagName === 'SELECT' && elemento.value === '') return null;
    return elemento.value;
  }

  async function crear(contenedor, def) {
    const necesitaGuild = def.campos.some(c => c.tipo === 'canal' || c.tipo === 'rol');
    const [guild, datos] = await Promise.all([necesitaGuild ? Api.get('/guild') : null, Api.get(`/config/${def.seccion}`)]);
    const estado = { original: copiar(datos), actual: copiar(datos), errores: {} };
    const sucio = () => JSON.stringify(estado.actual) !== JSON.stringify(estado.original);
    const accionesVisibles = (def.acciones || []).filter(a => !a.enLista);

    function pintarLateral() {
      const el = contenedor.querySelector('.editor-vista');
      if (!el) return;
      el.innerHTML = def.lateral ? def.lateral(estado.actual) : '';
      Mascota.pintar(el);
    }

    function mostrarErrores() {
      for (const el of contenedor.querySelectorAll('[data-error]')) {
        const texto = estado.errores[el.dataset.error];
        el.textContent = texto || '';
        el.hidden = !texto;
        const control = contenedor.querySelector(`[data-campo="${el.dataset.error}"]`);
        if (control) control.setAttribute('aria-invalid', texto ? 'true' : 'false');
      }
    }

    function actualizar() {
      const hay = sucio();
      Panel.marcarCambios(hay, { guardar, descartar });
      const botones = contenedor.querySelectorAll('[data-accion-seccion]');
      for (const boton of botones) boton.disabled = hay;
      const aviso = contenedor.querySelector('.aviso-acciones');
      if (aviso) aviso.hidden = !hay || !botones.length;
    }

    function pintar() {
      contenedor.innerHTML = `
        <header class="cabecera">
          <h1 class="titulo">${esc(def.titulo)}</h1>
          <div class="trazo"></div>
          ${def.descripcion ? `<p class="descripcion">${def.descripcion}</p>` : ''}
        </header>
        <div class="editor">
          <div class="editor-form">
            ${def.campos.map(c => campoHtml(c, estado.actual, guild)).join('')}
            ${accionesVisibles.length ? `<div class="acciones-seccion">${accionesVisibles.map(a => `<button type="button" class="boton boton-secundario" data-accion-seccion="${a.id}">${esc(a.texto)}</button>`).join('')}</div>` : ''}
            <p class="ayuda aviso-acciones" hidden>Guarda o descarta los cambios antes de usar las acciones.</p>
          </div>
          <div class="editor-vista"></div>
        </div>
        ${def.extra ? `<div class="seccion-extra">${def.extra(estado.actual)}</div>` : ''}`;
      pintarLateral();
      mostrarErrores();
      actualizar();
      Mascota.pintar(contenedor);
    }

    function filtrar(texto) {
      const buscado = texto.trim().toLowerCase();
      for (const fila of contenedor.querySelectorAll('[data-fila]')) {
        fila.hidden = Boolean(buscado) && !fila.dataset.texto.includes(buscado);
      }
    }

    function alCambiar(evento) {
      const buscador = evento.target.closest('[data-buscar]');
      if (buscador) {
        filtrar(buscador.value);
        return;
      }
      const elemento = evento.target.closest('[data-campo]');
      if (!elemento) return;
      const ruta = elemento.dataset.campo;
      estado.actual[ruta] = valorDe(elemento);
      if (estado.errores[ruta]) {
        delete estado.errores[ruta];
        mostrarErrores();
      }
      pintarLateral();
      actualizar();
    }

    async function recargar() {
      const nuevos = await Api.get(`/config/${def.seccion}`);
      estado.original = copiar(nuevos);
      estado.actual = copiar(nuevos);
      estado.errores = {};
      pintar();
    }

    async function ejecutar(boton) {
      if (sucio()) {
        Panel.aviso('Guarda o descarta los cambios primero.', 'error');
        return;
      }
      const accion = (def.acciones || []).find(a => a.id === boton.dataset.accionSeccion);
      if (!accion) return;
      if (accion.confirmar) {
        const opciones = typeof accion.confirmar === 'function' ? accion.confirmar(estado.actual, boton) : accion.confirmar;
        if (!(await Dialogo.confirmar(opciones))) return;
      }
      boton.disabled = true;
      try {
        const respuesta = await Api.post(`/config/${def.seccion}/${accion.id}`, accion.cuerpo ? accion.cuerpo(boton) : {});
        estado.original = copiar(respuesta.seccion);
        estado.actual = copiar(respuesta.seccion);
        estado.errores = {};
        pintar();
        Panel.aviso(respuesta.mensaje, 'exito');
      } catch (error) {
        if (error.estado === 404) {
          Panel.aviso(error.message, 'error');
          await recargar().catch(() => {});
        } else if (error.estado === 400 || error.estado === 502) {
          Panel.aviso(error.message, 'error');
        } else {
          Panel.manejarError(error, { enLinea: true });
        }
      } finally {
        if (boton.isConnected) boton.disabled = sucio();
      }
    }

    function alHacerClic(evento) {
      const boton = evento.target.closest('[data-accion-seccion]');
      if (boton) ejecutar(boton);
    }

    async function guardar() {
      try {
        const guardado = await Api.put(`/config/${def.seccion}`, estado.actual);
        estado.original = copiar(guardado);
        estado.actual = copiar(guardado);
        estado.errores = {};
        pintar();
        Panel.aviso('¡Cambios guardados! Shadow ya los está usando.', 'exito');
      } catch (error) {
        if (error.estado === 400 && error.cuerpo?.errores) {
          estado.errores = error.cuerpo.errores;
          mostrarErrores();
          Panel.aviso('Revisa los campos marcados.', 'error');
          return;
        }
        Panel.manejarError(error, { enLinea: true });
      }
    }

    function descartar() {
      estado.actual = copiar(estado.original);
      estado.errores = {};
      pintar();
    }

    contenedor.oninput = alCambiar;
    contenedor.onchange = alCambiar;
    contenedor.onclick = alHacerClic;
    pintar();
  }

  return { crear };
})();
```

Archivo: `web/panel/js/api.js`

```js
// Llamadas a la API del panel. Agrega el encabezado anti-CSRF y, si la sesión
// caducó, lleva al login.
const Api = (() => {
  class ErrorApi extends Error {
    constructor(estado, cuerpo) {
      super(cuerpo?.error || (estado ? `Error ${estado}` : 'Sin conexión con el bot.'));
      this.estado = estado;
      this.cuerpo = cuerpo;
    }
  }

  async function pedir(metodo, ruta, datos) {
    let respuesta;
    try {
      respuesta = await fetch(`/api${ruta}`, {
        method: metodo,
        credentials: 'same-origin',
        headers: { 'X-ShadowBot-Panel': '1', ...(datos ? { 'Content-Type': 'application/json' } : {}) },
        body: datos ? JSON.stringify(datos) : undefined,
      });
    } catch {
      throw new ErrorApi(0, null);
    }
    const cuerpo = await respuesta.json().catch(() => null);
    if (respuesta.status === 401) {
      location.href = '/panel/login.html?error=sesion';
      throw new ErrorApi(401, cuerpo);
    }
    if (!respuesta.ok) throw new ErrorApi(respuesta.status, cuerpo);
    return cuerpo;
  }

  return {
    ErrorApi,
    get: (ruta) => pedir('GET', ruta),
    put: (ruta, datos) => pedir('PUT', ruta, datos),
    post: (ruta, datos) => pedir('POST', ruta, datos ?? {}),
    cerrarSesion: () => fetch('/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'X-ShadowBot-Panel': '1' } }),
  };
})();
```

Archivo: `web/panel/js/secciones/logs.js`

```js
// Sección Logs: canales de moderación, actividad y seguridad.
const SeccionLogs = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'logs',
    titulo: 'Logs',
    descripcion: 'Dónde deja el bot el registro de lo que pasa en el servidor.',
    campos: [
      { ruta: 'moderacion', tipo: 'canal', etiqueta: 'Canal de moderación', ayuda: 'Ban, kick, mute y clear.' },
      { ruta: 'actividad', tipo: 'canal', etiqueta: 'Canal de actividad', ayuda: 'Entradas y salidas, voz, mensajes editados o borrados y cambios de perfil.' },
      { ruta: 'seguridad', tipo: 'canal', etiqueta: 'Canal de seguridad', ayuda: 'Roles y canales creados o borrados, permisos peligrosos, webhooks y los cambios hechos desde este panel. Si lo dejas vacío, van al de moderación.' },
    ],
    lateral: () => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Consejo</p>
        <p>Usa canales privados que solo vea el staff. Con <strong>Enviar prueba</strong> compruebas que el bot pueda escribir en cada uno.</p>
        <div class="mascota" data-estado="hola"></div>
      </div>`,
    acciones: [{ id: 'probar', texto: 'Enviar prueba' }],
  }),
};
```

Archivo: `web/panel/js/secciones/novedades.js`

```js
// Sección Novedades: canal, rol y publicación de NOVEDADES.md.
const SeccionNovedades = (() => {
  const esc = Formato.escapar;

  function lateral(datos) {
    const { info } = datos;
    const vista = info.versionArchivo
      ? `<div class="dc"><div class="dc-embed dc-anuncio"><div class="dc-texto"><div class="h2">🆕 ShadowBot v${esc(info.versionArchivo)}</div>${Formato.formatearMensaje(info.textoArchivo || '')}</div></div></div>`
      : '<p class="texto-suave">NOVEDADES.md todavía no tiene versiones.</p>';
    return `<div class="tarjeta">
        <p class="etiqueta">Estado</p>
        <dl class="datos">
          <dt>Versión más nueva</dt><dd>${info.versionArchivo ? `v${esc(info.versionArchivo)}` : '—'}${info.fechaArchivo ? ` <span class="texto-suave">(${esc(info.fechaArchivo)})</span>` : ''}</dd>
          <dt>Última anunciada</dt><dd>${info.ultimaAnunciada ? `v${esc(info.ultimaAnunciada)}` : 'Ninguna'}</dd>
          <dt>Anuncio automático</dt><dd>${info.automatico ? '<span class="estado-si">Activo</span>' : '<span class="estado-no">Apagado aquí</span>'}</dd>
        </dl>
        ${info.avisoRol ? `<p class="aviso-campo">${esc(info.avisoRol)}</p>` : ''}
      </div>
      <p class="etiqueta">Vista previa de la versión más nueva</p>
      ${vista}`;
  }

  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'novedades',
      titulo: 'Novedades',
      descripcion: 'Dónde anuncia el bot sus actualizaciones. El texto se escribe en <code>NOVEDADES.md</code>.',
      campos: [
        { ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de novedades' },
        { ruta: 'rol', tipo: 'rol', etiqueta: 'Rol a mencionar (opcional)', asignable: false, ayuda: 'Por ejemplo @Novedades, para quien quiera enterarse.' },
      ],
      lateral,
      acciones: [{
        id: 'publicar',
        texto: 'Publicar ahora',
        confirmar: (datos) => ({
          titulo: '¿Publicar las novedades?',
          texto: `Se publicará la v${datos.info.versionArchivo} en el canal de novedades${datos.rol ? ', mencionando al rol elegido' : ''}.`,
          boton: 'Publicar',
        }),
      }],
    }),
  };
})();
```

Archivo: `web/panel/js/secciones/fortnite.js`

```js
// Sección Tienda Fortnite: canal de la tienda diaria y publicación manual.
const SeccionFortnite = (() => {
  const esc = Formato.escapar;
  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'fortnite',
      titulo: 'Tienda Fortnite',
      descripcion: 'El bot publica la tienda del día automáticamente en este canal.',
      campos: [{ ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de la tienda' }],
      lateral: (datos) => `<div class="tarjeta">
          <p class="etiqueta">Estado</p>
          <dl class="datos">
            <dt>API de fnbr.co</dt><dd>${datos.info.apiKey ? '<span class="estado-si">Configurada</span>' : '<span class="estado-no">Falta FNBR_API_KEY</span>'}</dd>
            <dt>Última publicación</dt><dd>${datos.info.ultimaPublicacion ? esc(datos.info.ultimaPublicacion) : 'Nunca'}</dd>
          </dl>
          <p class="ayuda">Se publica sola cada día a las 00:05 UTC, cuando la tienda cambia en el juego.</p>
        </div>`,
      acciones: [{
        id: 'publicar',
        texto: 'Publicar ahora',
        confirmar: { titulo: '¿Publicar la tienda de hoy?', texto: 'Se enviará la tienda actual de Fortnite al canal configurado.', boton: 'Publicar' },
      }],
    }),
  };
})();
```

Archivo: `web/panel/js/secciones/cumpleanos.js`

```js
// Sección Cumpleaños: canal de anuncios y lista de cumpleaños registrados.
const SeccionCumpleanos = (() => {
  const esc = Formato.escapar;
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

  function lateral(datos) {
    const [proximo] = datos.lista;
    const texto = !proximo
      ? 'Todavía nadie ha registrado su cumpleaños.'
      : proximo.faltan === 0
        ? `¡Hoy es el cumpleaños de <strong>${esc(proximo.nombre)}</strong>! 🎉`
        : `El próximo es <strong>${esc(proximo.nombre)}</strong>, en ${proximo.faltan} ${proximo.faltan === 1 ? 'día' : 'días'}.`;
    return `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Próximo cumpleaños</p>
        <p>${texto}</p>
        <p class="ayuda">Cada quien registra el suyo con <code>/birthday register</code>.</p>
        <div class="mascota" data-estado="${proximo && proximo.faltan === 0 ? 'feliz' : 'hola'}"></div>
      </div>`;
  }

  function extra(datos) {
    if (!datos.lista.length) return '<div class="tarjeta vacio">Nadie ha registrado su cumpleaños todavía.</div>';
    const filas = datos.lista.map(c => `<li class="fila" data-fila data-texto="${esc(c.nombre.toLowerCase())}">
        <span class="fila-fecha">${c.dia} ${MESES[c.mes - 1]}</span>
        <span class="fila-nombre">${esc(c.nombre)}</span>
        <span class="fila-detalle">${c.faltan === 0 ? '¡Hoy! 🎉' : `en ${c.faltan} ${c.faltan === 1 ? 'día' : 'días'}`}${c.cumple ? ` · cumple ${c.cumple}` : ''}</span>
        <button type="button" class="boton-icono" data-accion-seccion="borrar" data-id="${esc(c.id)}" data-nombre="${esc(c.nombre)}" aria-label="Borrar el cumpleaños de ${esc(c.nombre)}" title="Borrar">${Iconos.svg('borrar')}</button>
      </li>`).join('');
    return `<div class="tarjeta">
        <div class="lista-cabecera">
          <h2 class="tarjeta-titulo">Cumpleaños registrados (${datos.lista.length})</h2>
          <input type="search" class="buscador" data-buscar placeholder="Buscar por nombre…" aria-label="Buscar cumpleaños">
        </div>
        <ul class="lista">${filas}</ul>
      </div>`;
  }

  return {
    render: (contenedor) => Formulario.crear(contenedor, {
      seccion: 'cumpleanos',
      titulo: 'Cumpleaños',
      descripcion: 'El bot felicita a cada quien en su día.',
      campos: [{ ruta: 'canal', tipo: 'canal', etiqueta: 'Canal de cumpleaños' }],
      lateral,
      extra,
      acciones: [{
        id: 'borrar',
        enLista: true,
        cuerpo: (boton) => ({ usuarioId: boton.dataset.id }),
        confirmar: (datos, boton) => ({
          titulo: '¿Borrar este cumpleaños?',
          texto: `Se borrará el cumpleaños de ${boton.dataset.nombre}. Podrá registrarlo de nuevo con /birthday register.`,
          boton: 'Borrar',
          peligro: true,
        }),
      }],
    }),
  };
})();
```

Archivo: `web/panel/js/secciones/ia.js`

```js
// Sección IA: nombre, personalidad, modelo y estado de /ask.
const SeccionIa = {
  render: (contenedor) => Formulario.crear(contenedor, {
    seccion: 'ia',
    titulo: 'Inteligencia artificial',
    descripcion: 'Cómo se llama y cómo habla Shadow cuando alguien usa <code>/ask</code>.',
    campos: [
      { ruta: 'activada', tipo: 'interruptor', etiqueta: 'IA activada', ayuda: 'Apágala para desactivar /ask y las demás funciones de IA.' },
      { ruta: 'nombre', tipo: 'texto', etiqueta: 'Nombre', max: 32 },
      { ruta: 'modelo', tipo: 'opciones', etiqueta: 'Modelo', opciones: (datos) => datos.info.opcionesModelo },
      { ruta: 'personalidad', tipo: 'area', etiqueta: 'Personalidad', max: 1500, filas: 9, ayuda: 'Describe su tono y carácter. Se usa como instrucción de sistema.' },
    ],
    lateral: (datos) => `<div class="tarjeta lateral-consejo">
        <p class="etiqueta">Estado</p>
        <dl class="datos">
          <dt>API de OpenAI</dt><dd>${datos.info.apiKey ? '<span class="estado-si">Configurada</span>' : '<span class="estado-no">Falta OPENAI_API_KEY</span>'}</dd>
          <dt>/ask</dt><dd>${datos.activada ? '<span class="estado-si">Disponible</span>' : '<span class="estado-no">Desactivado</span>'}</dd>
        </dl>
        <div class="mascota" data-estado="${datos.activada ? 'feliz' : 'triste'}"></div>
      </div>`,
    acciones: [{
      id: 'restablecer',
      texto: 'Restablecer personalidad',
      confirmar: { titulo: '¿Restablecer la IA?', texto: 'Se volverá al nombre, personalidad y modelo de fábrica.', boton: 'Restablecer', peligro: true },
    }],
  }),
};
```

Archivo: `web/panel/js/iconos.js`

```js
// Iconos propios del panel (SVG 24x24). Los de sección son kawaii con contorno
// de tinta (clases .k y .k2 en styles.css); los de formulario son de línea.
const Iconos = (() => {
  const KAWAII = {
    inicio: '<path class="k" d="M4.5 11 12 4.5l7.5 6.5V20h-15z"/><path class="k2" d="M10 20v-3.2a2 2 0 0 1 4 0V20z"/><circle cx="9.6" cy="12.8" r="1" class="tinta"/><circle cx="14.4" cy="12.8" r="1" class="tinta"/><ellipse cx="8.3" cy="14.6" rx="1.1" ry=".6" class="rubor"/><ellipse cx="15.7" cy="14.6" rx="1.1" ry=".6" class="rubor"/>',
    bienvenida: '<path class="k2" d="M5 21V11.5c0-4.2 3.2-7.5 7-8.8 3.8 1.3 7 4.6 7 8.8V21z"/><path class="puerta" d="M8.5 21v-7.5a3.5 3.5 0 0 1 7 0V21z"/><circle cx="10.6" cy="15" r=".9" class="ojo-brillo"/><circle cx="13.4" cy="15" r=".9" class="ojo-brillo"/>',
    logs: '<path class="k" d="M12 3l7 3v5.5c0 4.6-3 7.9-7 9.5-4-1.6-7-4.9-7-9.5V6z"/><path class="k2 sin-borde" d="M12 3v18c-4-1.6-7-4.9-7-9.5V6z"/><path class="trazo-tinta" d="M8.9 11.2q1-1 2 0M13.1 11.2q1-1 2 0M10.8 14q1.2 1 2.4 0"/>',
    grupos: '<path class="k" d="M7.2 8.5h9.6a4 4 0 0 1 3.9 4.9l-.8 3.6a1.9 1.9 0 0 1-3.3.8l-1.9-2.3H9.3l-1.9 2.3a1.9 1.9 0 0 1-3.3-.8l-.8-3.6a4 4 0 0 1 3.9-4.9z"/><circle cx="10" cy="12.3" r="1" class="tinta"/><circle cx="14" cy="12.3" r="1" class="tinta"/><path class="trazo-tinta" d="M11.1 14q.9.8 1.8 0"/><circle cx="17.3" cy="11.4" r=".9" class="acento"/>',
    niveles: '<rect class="k" x="4.5" y="13" width="4" height="7" rx="1.2"/><rect class="k" x="10" y="9.5" width="4" height="10.5" rx="1.2"/><rect class="k2" x="15.5" y="5" width="4" height="15" rx="1.2"/><circle cx="16.8" cy="9.3" r=".8" class="tinta"/><circle cx="18.2" cy="9.3" r=".8" class="tinta"/><path class="k" d="M17.5 1.8l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"/>',
    novedades: '<path class="k" d="M6.5 4.5h11a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H7A2.5 2.5 0 0 1 4.5 17.5v-11a2 2 0 0 1 2-2z"/><circle cx="9.8" cy="10.6" r="1" class="tinta"/><circle cx="14.2" cy="10.6" r="1" class="tinta"/><path class="trazo-tinta" d="M10.7 12.8q1.3 1.3 2.6 0"/><path class="trazo-acento" d="M8 16.6h8"/>',
    ia: '<circle class="k2" cx="12" cy="11" r="7"/><path class="k" d="M7.5 20.5h9l-1.5-3h-6z"/><circle cx="9.7" cy="10.5" r="1.1" class="ojo-blanco"/><circle cx="14.3" cy="10.5" r="1.1" class="ojo-blanco"/><path class="trazo-blanco" d="M8.6 7.5a4.5 4.5 0 0 1 2.4-2"/>',
    pastel: '<rect class="k" x="4" y="11" width="16" height="9" rx="2"/><path class="k2" d="M4 14.5q2 1.6 4 0t4 0 4 0 4 0V13a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2z"/><path class="k" d="M11 6.2h2V11h-2z"/><path class="llama" d="M12 2.4c1 1.2 1.3 2.2 0 3.3-1.3-1.1-1-2.1 0-3.3z"/><circle cx="9.5" cy="16.8" r=".9" class="tinta"/><circle cx="14.5" cy="16.8" r=".9" class="tinta"/><path class="trazo-tinta" d="M11.2 18q.8.7 1.6 0"/>',
    tienda: '<path class="k" d="M5 8h14l-1.2 12H6.2z"/><path class="trazo-tinta" d="M9 10V7a3 3 0 0 1 6 0v3"/><circle cx="10" cy="14" r="1" class="tinta"/><circle cx="14" cy="14" r="1" class="tinta"/><path class="trazo-tinta" d="M11 16q1 .9 2 0"/><circle cx="17" cy="10.8" r=".9" class="acento"/>',
  };
  const LINEA = {
    canal: '<path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h16M3.5 15h16"/>',
    rol: '<path d="M12 2.8 14.6 8l5.6.8-4.1 4 1 5.6L12 15.7l-5.1 2.7 1-5.6-4.1-4L9.4 8z"/>',
    color: '<path d="M12 3c3.2 4.1 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.9 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
    guardar: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    descartar: '<path d="M9 14.5 4 9.5l5-5M4 9.5h10.5a5 5 0 0 1 0 10H12"/>',
    borrar: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5"/>',
    salir: '<path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5M10 16l4-4-4-4M14 12H4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
  };

  function svg(nombre, clase = '') {
    if (KAWAII[nombre]) return `<svg class="icono icono-kawaii ${clase}" viewBox="0 0 24 24" aria-hidden="true">${KAWAII[nombre]}</svg>`;
    return `<svg class="icono icono-linea ${clase}" viewBox="0 0 24 24" aria-hidden="true">${LINEA[nombre] || ''}</svg>`;
  }

  return { svg };
})();
```

Archivo: `web/panel/js/secciones/inicio.js`

```js
// Página de Inicio: saludo, estado del bot, servidor y accesos.
const SeccionInicio = (() => {
  const esc = Formato.escapar;

  function duracion(segundos) {
    const d = Math.floor(segundos / 86400);
    const h = Math.floor((segundos % 86400) / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    if (d) return `${d} d ${h} h`;
    if (h) return `${h} h ${m} min`;
    return `${m} min`;
  }

  async function render(contenedor) {
    const { usuario, servidor, bot } = Panel.me;
    const icono = servidor.iconoUrl
      ? `<img src="${esc(servidor.iconoUrl)}" alt="">`
      : `<span class="servidor-inicial">${esc(servidor.nombre.charAt(0))}</span>`;
    const accesos = Panel.secciones
      .filter(s => s.ruta !== 'inicio')
      .map(s => `<a class="acceso" href="#/${s.ruta}">${Iconos.svg(s.icono, 'icono-seccion')}<span>${esc(s.nombre)}</span></a>`)
      .join('');
    contenedor.innerHTML = `
      <header class="cabecera">
        <h1 class="titulo">¡Hola, ${esc(usuario.nombre)}!</h1>
        <div class="trazo"></div>
      </header>
      <div class="inicio-grid">
        <section class="tarjeta inicio-saludo">
          <div class="mascota" data-estado="hola"></div>
          <p>Shadow está despierto y cuidando <strong>${esc(servidor.nombre)}</strong>. Desde aquí puedes configurar el bot sin escribir comandos.</p>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Estado del bot</h2>
          <dl class="datos">
            <dt>Estado</dt><dd><span class="punto-en-linea"></span>${bot.enLinea ? 'En línea' : 'Desconectado'}</dd>
            <dt>Encendido hace</dt><dd>${duracion(bot.uptime)}</dd>
            <dt>Bot</dt><dd>${esc(bot.tag)}</dd>
          </dl>
        </section>
        <section class="tarjeta">
          <h2 class="tarjeta-titulo">Servidor</h2>
          <div class="servidor">${icono}<div><strong>${esc(servidor.nombre)}</strong><br><span class="texto-suave">${servidor.miembros} miembros</span></div></div>
        </section>
        <section class="tarjeta inicio-accesos">
          <h2 class="tarjeta-titulo">Secciones</h2>
          <div class="accesos">${accesos}</div>
        </section>
      </div>`;
    Mascota.pintar(contenedor);
  }

  return { render };
})();
```

Archivo: `web/panel/js/app.js`

```js
// Arranque del panel: tema, usuario, barra lateral, navegación y avisos.
const Panel = (() => {
  const esc = Formato.escapar;
  const $ = (selector) => document.querySelector(selector);
  const SECCIONES = [
    { ruta: 'inicio', nombre: 'Inicio', icono: 'inicio', grupo: null, modulo: () => SeccionInicio },
    { ruta: 'bienvenida', nombre: 'Bienvenida', icono: 'bienvenida', grupo: 'Servidor', modulo: () => SeccionBienvenida },
    { ruta: 'logs', nombre: 'Logs', icono: 'logs', grupo: 'Servidor', modulo: () => SeccionLogs },
    { ruta: 'cumpleanos', nombre: 'Cumpleaños', icono: 'pastel', grupo: 'Servidor', modulo: () => SeccionCumpleanos },
    { ruta: 'novedades', nombre: 'Novedades', icono: 'novedades', grupo: 'Comunidad', modulo: () => SeccionNovedades },
    { ruta: 'fortnite', nombre: 'Tienda Fortnite', icono: 'tienda', grupo: 'Comunidad', modulo: () => SeccionFortnite },
    { ruta: 'ia', nombre: 'IA', icono: 'ia', grupo: 'Comunidad', modulo: () => SeccionIa },
  ];
  let rutaActual = null;
  let sucio = false;
  let manejadores = null;
  let ignorarHash = false;
  let temporizadorAviso = null;

  const panel = { me: null, secciones: SECCIONES, marcarCambios, aviso, manejarError };

  function aplicarTema(tema) {
    document.documentElement.dataset.tema = tema;
    Mascota.pintar(document);
    Mascota.decorar($('.decoracion'), tema);
  }

  function marcarCambios(valor, nuevos) {
    sucio = valor;
    if (nuevos) manejadores = nuevos;
    $('#barra-guardar').hidden = !valor;
  }

  function aviso(texto, tipo = 'exito') {
    const el = $('#aviso');
    el.className = `aviso aviso-${tipo}`;
    el.innerHTML = `<span class="mascota" data-estado="${tipo === 'exito' ? 'feliz' : 'triste'}"></span><span class="aviso-texto"></span>`;
    el.querySelector('.aviso-texto').textContent = texto;
    Mascota.pintar(el);
    el.hidden = false;
    clearTimeout(temporizadorAviso);
    temporizadorAviso = setTimeout(() => { el.hidden = true; }, 4500);
  }

  function pantallaError(titulo, texto, acciones = '') {
    const cont = $('#contenido');
    cont.innerHTML = `<div class="pantalla-error tarjeta">
      <div class="mascota" data-estado="triste"></div>
      <h1 class="titulo">${esc(titulo)}</h1>
      <p>${esc(texto)}</p>
      <div class="acciones">${acciones}</div>
    </div>`;
    Mascota.pintar(cont);
  }

  function manejarError(error, { enLinea = false } = {}) {
    if (error.estado === 401) return;
    if (error.estado === 403) {
      pantallaError('No tienes acceso', 'Necesitas Administrador o Gestionar servidor en el servidor del bot.', '<button type="button" class="boton" data-accion="salir">Cerrar sesión</button>');
      return;
    }
    if (error.estado === 503) {
      pantallaError('Shadow se está despertando…', 'El bot está arrancando. Reintento en unos segundos.');
      setTimeout(() => location.reload(), 5000);
      return;
    }
    if (enLinea) {
      aviso(error.message || 'Algo falló. Inténtalo de nuevo.', 'error');
      return;
    }
    pantallaError('Algo falló', error.message || 'No se pudo cargar la página.', '<button type="button" class="boton" data-accion="reintentar">Reintentar</button>');
  }

  function pintarUsuario() {
    const { usuario } = panel.me;
    $('#usuario').innerHTML = `<img src="${esc(usuario.avatarUrl)}" alt="">
      <span class="usuario-nombre">${esc(usuario.nombre)}</span>
      <button type="button" class="boton-icono" data-accion="salir" aria-label="Cerrar sesión" title="Cerrar sesión">${Iconos.svg('salir')}</button>`;
  }

  function pintarBarraLateral() {
    const enlace = (s) => `<a href="#/${s.ruta}" data-ruta="${s.ruta}">${Iconos.svg(s.icono, 'icono-seccion')}<span>${s.nombre}</span></a>`;
    let html = SECCIONES.filter(s => !s.grupo).map(enlace).join('');
    for (const grupo of [...new Set(SECCIONES.map(s => s.grupo).filter(Boolean))]) {
      html += `<p class="grupo">${grupo}</p>` + SECCIONES.filter(s => s.grupo === grupo).map(enlace).join('');
    }
    $('#barra-lateral').innerHTML = html;
  }

  async function navegar() {
    if (ignorarHash) {
      ignorarHash = false;
      return;
    }
    const ruta = location.hash.replace(/^#\/?/, '') || 'inicio';
    const seccion = SECCIONES.find(s => s.ruta === ruta) || SECCIONES[0];
    if (sucio && seccion.ruta !== rutaActual) {
      if (!confirm('Tienes cambios sin guardar. ¿Salir sin guardarlos?')) {
        ignorarHash = true;
        location.hash = `#/${rutaActual}`;
        return;
      }
      marcarCambios(false);
    }
    rutaActual = seccion.ruta;
    for (const enlace of document.querySelectorAll('#barra-lateral a')) {
      const activo = enlace.dataset.ruta === seccion.ruta;
      enlace.classList.toggle('activo', activo);
      if (activo) enlace.setAttribute('aria-current', 'page');
      else enlace.removeAttribute('aria-current');
    }
    document.body.classList.remove('menu-abierto');
    $('#boton-menu').setAttribute('aria-expanded', 'false');
    document.title = `${seccion.nombre} · ShadowBot`;
    const cont = $('#contenido');
    cont.oninput = cont.onchange = cont.onclick = null; // quita los manejadores de la sección anterior
    cont.innerHTML = '<div class="cargando"><span class="mascota" data-estado="hola"></span>Cargando…</div>';
    Mascota.pintar(cont);
    try {
      await seccion.modulo().render(cont);
      cont.focus({ preventScroll: true });
    } catch (error) {
      manejarError(error);
    }
  }

  function alHacerClic(evento) {
    const objetivo = evento.target.closest('[data-accion], #boton-menu, #boton-guardar, #boton-descartar');
    if (!objetivo) return;
    if (objetivo.id === 'boton-menu') {
      const abierto = document.body.classList.toggle('menu-abierto');
      objetivo.setAttribute('aria-expanded', String(abierto));
    } else if (objetivo.id === 'boton-guardar') {
      manejadores?.guardar();
    } else if (objetivo.id === 'boton-descartar') {
      manejadores?.descartar();
    } else if (objetivo.dataset.accion === 'salir') {
      if (sucio && !confirm('Tienes cambios sin guardar. ¿Cerrar sesión igualmente?')) return;
      sucio = false;
      Api.cerrarSesion().finally(() => { location.href = '/panel/login.html'; });
    } else if (objetivo.dataset.accion === 'reintentar') {
      location.reload();
    }
  }

  async function iniciar() {
    $('#boton-menu').innerHTML = Iconos.svg('menu');
    document.addEventListener('click', alHacerClic);
    window.addEventListener('beforeunload', (evento) => {
      if (!sucio) return;
      evento.preventDefault();
      evento.returnValue = '';
    });
    fetch('/api/tema').then(r => r.json()).then(d => aplicarTema(d.temporada)).catch(() => aplicarTema('normal'));
    try {
      panel.me = await Api.get('/me');
    } catch (error) {
      manejarError(error);
      return;
    }
    aplicarTema(panel.me.temporada);
    pintarUsuario();
    pintarBarraLateral();
    window.addEventListener('hashchange', navegar);
    await navegar();
  }

  document.addEventListener('DOMContentLoaded', iniciar);
  return panel;
})();
```

Archivo: `web/panel/index.html`

```html
<!doctype html>
<html lang="es" data-tema="normal">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Panel · ShadowBot</title>
  <link rel="icon" href="/panel/img/logo.webp">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Permanent+Marker&display=swap">
  <link rel="stylesheet" href="/panel/styles.css">
  <link rel="stylesheet" href="/panel/componentes.css">
</head>
<body class="app">
  <a class="saltar" href="#contenido">Saltar al contenido</a>
  <div class="decoracion" aria-hidden="true"></div>
  <header class="barra-superior">
    <button type="button" class="boton-icono boton-menu" id="boton-menu" aria-label="Abrir menú" aria-expanded="false" aria-controls="barra-lateral"></button>
    <a class="marca-mini" href="#/inicio"><span class="mascota mascota-mini" data-estado="hola"></span><span class="marca">ShadowBot</span></a>
    <div class="usuario" id="usuario"></div>
  </header>
  <nav class="barra-lateral" id="barra-lateral" aria-label="Secciones"></nav>
  <main class="contenido" id="contenido" tabindex="-1"></main>
  <div class="barra-guardar" id="barra-guardar" hidden>
    <span>Tienes cambios sin guardar</span>
    <div class="barra-guardar-botones">
      <button type="button" class="boton boton-fantasma" id="boton-descartar">Descartar</button>
      <button type="button" class="boton" id="boton-guardar">Guardar</button>
    </div>
  </div>
  <div class="aviso" id="aviso" role="status" aria-live="polite" hidden></div>
  <script src="/panel/js/formato.js"></script>
  <script src="/panel/js/iconos.js"></script>
  <script src="/panel/js/mascota.js"></script>
  <script src="/panel/js/api.js"></script>
  <script src="/panel/js/dialogo.js"></script>
  <script src="/panel/js/formulario.js"></script>
  <script src="/panel/js/secciones/inicio.js"></script>
  <script src="/panel/js/secciones/bienvenida.js"></script>
  <script src="/panel/js/secciones/logs.js"></script>
  <script src="/panel/js/secciones/cumpleanos.js"></script>
  <script src="/panel/js/secciones/novedades.js"></script>
  <script src="/panel/js/secciones/fortnite.js"></script>
  <script src="/panel/js/secciones/ia.js"></script>
  <script src="/panel/js/app.js"></script>
</body>
</html>
```

Archivo: `web/panel/componentes.css`

```css
/* Componentes del panel añadidos en el subproyecto 2: campos de texto,
   interruptor, acciones, diálogo, listas y estados. */

input[type="text"], input[type="search"] {
  width: 100%; padding: 10px 12px;
  background: var(--campo); color: var(--texto);
  border: 2px solid var(--borde); border-radius: 10px;
  font: inherit;
}
input[type="text"]:focus, input[type="search"]:focus { border-color: var(--acento); outline: none; box-shadow: 0 0 0 3px var(--brillo); }

/* Interruptor */
.interruptor { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; font-weight: 600; }
.interruptor input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.interruptor-pista { position: relative; flex: none; width: 48px; height: 28px; border: 2px solid var(--borde); border-radius: 999px; background: var(--campo); transition: background .15s, border-color .15s; }
.interruptor-pista::after { content: ''; position: absolute; top: 4px; left: 4px; width: 16px; height: 16px; border-radius: 50%; background: var(--texto-3); transition: transform .15s, background .15s; }
.interruptor input:checked + .interruptor-pista { background: var(--acento); border-color: var(--tinta); }
.interruptor input:checked + .interruptor-pista::after { transform: translateX(20px); background: #fff; }
.interruptor input:focus-visible + .interruptor-pista { outline: 3px solid var(--acento); outline-offset: 2px; }

/* Acciones de sección */
.acciones-seccion { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
.boton-secundario { background: var(--violeta); color: #fff; font-size: 15px; }
.boton-peligro { background: var(--error); color: var(--tinta); }
.boton[disabled], .boton-icono[disabled] { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
.aviso-campo { margin: 10px 0 0; padding: 8px 10px; border: 2px solid #f0b45e; border-radius: 10px; background: rgba(240, 180, 94, .1); color: #ffe0b3; font-size: 13px; }

/* Estados en tarjetas laterales */
.estado-si, .estado-no { display: inline-block; padding: 1px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.estado-si { background: rgba(61, 220, 132, .15); color: #8ff0b8; }
.estado-no { background: rgba(255, 107, 129, .15); color: #ffb3bf; }
.editor-vista > .tarjeta + .etiqueta { margin-top: 16px; }
.lateral-consejo .mascota { display: block; width: 100px; margin: 8px auto 0; }
.dc-anuncio { border-left-color: #9b59b6; max-height: 420px; overflow-y: auto; }

/* Inicio: accesos en cuadrícula */
.inicio-accesos { grid-column: 1 / -1; }
.accesos { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 10px; }

/* Bloque extra y listas */
.seccion-extra { margin-top: 24px; }
.lista-cabecera { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.lista-cabecera .tarjeta-titulo { margin: 0; }
.buscador { max-width: 260px; }
.lista { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; list-style: none; }
.fila { display: grid; grid-template-columns: 70px minmax(0, 1fr) auto auto; align-items: center; gap: 12px; padding: 8px 10px; border: 2px solid var(--borde); border-radius: 12px; background: var(--violeta-2); }
.fila-fecha { font-family: 'Permanent Marker', cursive; color: var(--lila); }
.fila-nombre { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fila-detalle { font-size: 13px; color: var(--texto-3); }
.fila .boton-icono { width: 34px; height: 34px; }
.fila .boton-icono:hover { color: var(--error); border-color: var(--error); }
.vacio { color: var(--texto-3); text-align: center; }

/* Diálogo de confirmación */
.dialogo {
  max-width: min(420px, calc(100vw - 32px)); padding: 22px 22px 18px;
  border: 3px solid var(--tinta); border-radius: 20px;
  background: #120726; color: var(--texto); text-align: center;
  box-shadow: 6px 6px 0 var(--acento);
}
.dialogo::backdrop { background: rgba(5, 2, 10, .72); }
.dialogo .mascota { width: 96px; }
.dialogo-titulo { font-size: 24px; }
.dialogo-texto { margin: 8px 0 0; color: var(--texto-2); }
.dialogo-botones { display: flex; justify-content: center; gap: 10px; margin-top: 18px; }

@media (max-width: 767px) {
  .fila { grid-template-columns: 60px minmax(0, 1fr) auto; }
  .fila-detalle { grid-column: 2 / 3; }
  .buscador { max-width: none; }
}
```

- [ ] **Step 2: Verificar** — `node --check` de cada JS de `web/panel/js` → sin errores; `npm test` → PASS.
- [ ] **Step 3: Prueba en el navegador** con `preview-panel.js` (bot falso con canales que aceptan `send`, almacenes `personalidad` y `cumpleanos` de ejemplo): Logs (Enviar prueba), Novedades (vista previa, Publicar con confirmación), Fortnite (estado, error sin API key), Cumpleaños (lista, buscador, borrar con confirmación), IA (interruptor, modelo, errores de validación, restablecer), acciones desactivadas con cambios sin guardar, móvil a 375 px, consola sin errores de CSP.
- [ ] **Step 4:** `git add web/panel docs/superpowers`
