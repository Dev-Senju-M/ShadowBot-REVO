// Editor de listas y secciones Buscar grupo, Niveles y Auto-respuestas (sin red ni base real)
const { test } = require('node:test');
const assert = require('node:assert');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const store = require('../src/utils/db');

const memoria = { grupos: { guilds: {} } };
store.get = (nombre) => JSON.parse(JSON.stringify(memoria[nombre] ?? {}));
store.set = (nombre, datos) => { memoria[nombre] = JSON.parse(JSON.stringify(datos)); };

const { ErrorAccion, validarLista, validarNumero, validarTexto } = require('../src/web/secciones/comun');
const grupos = require('../src/web/secciones/grupos');
const niveles = require('../src/web/secciones/niveles');
const autorespuestas = require('../src/web/secciones/autorespuestas');

function guildFalso({ canales = ['c1', 'c2'], permisos = [PermissionFlagsBits.ManageChannels] } = {}) {
  const cache = new Map(canales.map(id => [id, { id, name: id, type: ChannelType.GuildText, permissionsFor: () => ({ has: () => true }) }]));
  let creados = 0;
  return {
    id: 'g1',
    channels: {
      cache,
      create: async (opciones) => {
        const canal = { id: `nuevo${++creados}`, name: opciones.name, type: opciones.type, setParent: async () => {} };
        cache.set(canal.id, canal);
        return canal;
      },
    },
    roles: { cache: new Map([
      ['g1', { id: 'g1', position: 0 }],
      ['r-a', { id: 'r-a', position: 1, managed: false, mentionable: true }],
      ['r-b', { id: 'r-b', position: 2, managed: false, mentionable: true }],
      ['r-c', { id: 'r-c', position: 3, managed: false, mentionable: false }],
      ['r-alto', { id: 'r-alto', position: 9, managed: false, mentionable: true }],
    ]) },
    members: { me: { roles: { highest: { position: 5 } }, permissions: { has: (p) => permisos.includes(p) } } },
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

// ── validarNumero y validarLista ──

test('validarNumero: enteros dentro del rango', () => {
  const errores = {};
  assert.strictEqual(validarNumero(5, errores, 'a', { min: 1, max: 10 }), 5);
  assert.strictEqual(validarNumero('7', errores, 'b', { min: 1, max: 10 }), 7);
  assert.deepStrictEqual(errores, {});
});

test('validarNumero: vacío, decimales, texto y fuera de rango dan error (nunca NaN)', () => {
  for (const [valor, texto] of [[null, /entero/], ['', /entero/], [5.5, /entero/], ['abc', /entero/], [{}, /entero/], [0, /entre 1 y 10/], [11, /entre 1 y 10/]]) {
    const errores = {};
    assert.strictEqual(validarNumero(valor, errores, 'n', { min: 1, max: 10 }), null, String(valor));
    assert.match(errores.n, texto, String(valor));
  }
});

const opcionesLista = (errores, maximo = 10) => ({
  maximo,
  esVacia: (f) => !f.n,
  validarFila: (f, p) => ({ n: validarTexto(f.n, errores, `${p}.n`, { min: 1, max: 5 }) }),
  claveUnica: (f) => ['n', f.n.toLowerCase()],
});

test('validarLista: descarta vacías y los errores usan el índice que ve el usuario', () => {
  const errores = {};
  const filas = [{ n: 'a' }, { n: '' }, { n: 'x'.repeat(9) }, { n: 'A' }, 'basura', { n: 'b' }];
  assert.deepStrictEqual(validarLista(filas, errores, 'lista', opcionesLista(errores)), [{ n: 'a' }, { n: 'b' }]);
  assert.deepStrictEqual(Object.keys(errores).sort(), ['lista.2.n', 'lista.3.n', 'lista.4']);
  assert.match(errores['lista.2.n'], /Máximo 5/);
  assert.match(errores['lista.3.n'], /fila 1/);
  assert.match(errores['lista.4'], /inválida/);
});

test('validarLista: formas inesperadas y máximo', () => {
  let errores = {};
  assert.deepStrictEqual(validarLista(null, errores, 'l', opcionesLista(errores)), []);
  assert.deepStrictEqual(errores, {});
  assert.deepStrictEqual(validarLista('texto', errores, 'l', opcionesLista(errores)), []);
  assert.match(errores.l, /inválida/);
  errores = {};
  validarLista([{ n: 'a' }, { n: 'b' }, { n: 'c' }, { n: '' }], errores, 'l', opcionesLista(errores, 2));
  assert.match(errores.l, /Máximo 2/);
});

// ── Buscar grupo ──

const datosGrupos = () => ({ grupos: { guilds: {
  g1: {
    config: { canalAnuncios: 'c1', canalCrearSala: 'v1', categoriaSalas: 'cat' },
    juegos: [{ nombre: 'Fortnite', rolId: 'r-a' }, { nombre: 'Valorant', rolId: 'r-c' }, { nombre: 'Viejo', rolId: 'r-borrado' }],
    anuncios: { a1: { id: 'a1' } },
    salas: { s1: { ownerId: 'u1' }, s2: { ownerId: 'u2' } },
  },
  otro: { juegos: [{ nombre: 'X', rolId: 'r' }] },
} } });

test('grupos: leer muestra canal, juegos y estado (aunque un rol ya no exista)', () => {
  const guild = guildFalso({ canales: ['c1', 'v1', 'cat'] });
  const datos = grupos.leer(datosGrupos(), { guild });
  assert.strictEqual(datos.canal, 'c1');
  assert.deepStrictEqual(datos.juegos.map(j => j.nombre), ['Fortnite', 'Valorant', 'Viejo']);
  assert.deepStrictEqual(datos.info, { salasListas: true, canalCrearSala: 'v1', anunciosAbiertos: 1, salasAbiertas: 2, rolesNoMencionables: ['Valorant'] });
  assert.deepStrictEqual(grupos.leer({ grupos: {} }, { guild }).juegos, [], 'servidor sin datos');
});

test('grupos: validar por celda (vacíos, sin rol, repetidos, rol borrado)', () => {
  const guild = guildFalso();
  const { valores, errores } = grupos.validar({ canal: 'c1', juegos: [
    { nombre: ' Fortnite ', rolId: 'r-a' },
    { nombre: '', rolId: null },
    { nombre: 'Valorant', rolId: null },
    { nombre: 'fortnite', rolId: 'r-b' },
    { nombre: '', rolId: 'r-b' },
    { nombre: 'Viejo', rolId: 'r-borrado' },
    { nombre: 'Todos', rolId: 'g1' },
  ] }, { guild });
  assert.deepStrictEqual(valores, { canal: 'c1', juegos: [{ nombre: 'Fortnite', rolId: 'r-a' }] });
  assert.deepStrictEqual(Object.keys(errores).sort(), ['juegos.2.rolId', 'juegos.3.nombre', 'juegos.4.nombre', 'juegos.5.rolId', 'juegos.6.rolId']);
  assert.match(errores['juegos.3.nombre'], /fila 1/);
  assert.match(grupos.validar({ juegos: 'x' }, { guild }).errores.juegos, /inválida/);
  assert.deepStrictEqual(grupos.validar({}, { guild }), { valores: { canal: null, juegos: [] }, errores: {} });
});

test('grupos: guardar solo cambia canal y juegos de este servidor', () => {
  const datos = datosGrupos();
  const { grupos: nuevo } = grupos.guardar({ canal: 'c2', juegos: [{ nombre: 'Rocket', rolId: 'r-b' }] }, datos, { guild: guildFalso() });
  assert.strictEqual(nuevo.guilds.g1.config.canalAnuncios, 'c2');
  assert.strictEqual(nuevo.guilds.g1.config.canalCrearSala, 'v1');
  assert.deepStrictEqual(nuevo.guilds.g1.juegos, [{ nombre: 'Rocket', rolId: 'r-b' }]);
  assert.deepStrictEqual(nuevo.guilds.g1.anuncios, datos.grupos.guilds.g1.anuncios);
  assert.deepStrictEqual(nuevo.guilds.g1.salas, datos.grupos.guilds.g1.salas);
  assert.deepStrictEqual(nuevo.guilds.otro, datos.grupos.guilds.otro);
});

test('grupos.crearSalas: crea los canales y guarda sin pisar cambios hechos mientras tanto', async () => {
  memoria.grupos = { guilds: { g1: { juegos: [{ nombre: 'Fortnite', rolId: 'r-a' }] } } };
  const guild = guildFalso();
  const leido = { grupos: store.get('grupos') };
  // Mientras se "crean" los canales, un evento registra una sala nueva:
  const crear = guild.channels.create;
  guild.channels.create = async (opciones) => {
    const g = store.get('grupos');
    g.guilds.g1.salas = { sala9: { ownerId: 'u9' } };
    store.set('grupos', g);
    return crear(opciones);
  };
  const r = await grupos.acciones.crearSalas.ejecutar({}, { guild }, leido);
  assert.match(r.mensaje, /Crear sala/);
  assert.strictEqual(r.cambios, undefined);
  const guardado = memoria.grupos.guilds.g1;
  assert.ok(guild.channels.cache.has(guardado.config.categoriaSalas));
  assert.ok(guild.channels.cache.has(guardado.config.canalCrearSala));
  assert.deepStrictEqual(guardado.salas, { sala9: { ownerId: 'u9' } }, 'no se perdió la sala registrada mientras tanto');
  assert.deepStrictEqual(guardado.juegos, [{ nombre: 'Fortnite', rolId: 'r-a' }]);

  await rechaza(grupos.acciones.crearSalas.ejecutar({}, { guild }, { grupos: store.get('grupos') }), 400, /ya están/);
  await rechaza(grupos.acciones.crearSalas.ejecutar({}, { guild: guildFalso({ permisos: [] }) }, { grupos: { guilds: {} } }), 400, /Gestionar canales/);
});

// ── Niveles y logros ──

const datosNiveles = () => ({ levels: {
  canal_notificaciones: 'c1',
  niveles: [
    { nivel: 2, nombre: 'Caballero', rol_id: 'r-b', horas_voz: 10, mensajes: 200, requisito_texto: 'viejo' },
    { nivel: 1, nombre: 'Novato', rol_id: 'r-a', horas_voz: 1, mensajes: 0 },
    { nivel: 3, nombre: 'Insomnio', rol_id: 'r-c', horas_voz: 0, mensajes: 0 },
  ],
  usuarios: { u1: { mensajes: 5, minutos_voz: 60, nivel: 1 } },
  otraClave: true,
} });

test('niveles: leer separa niveles normales (ordenados) y logros especiales', () => {
  const datos = niveles.leer(datosNiveles(), { guild: guildFalso() });
  assert.strictEqual(datos.canal, 'c1');
  assert.deepStrictEqual(datos.niveles, [
    { nivel: 1, nombre: 'Novato', rolId: 'r-a', horasVoz: 1, mensajes: 0 },
    { nivel: 2, nombre: 'Caballero', rolId: 'r-b', horasVoz: 10, mensajes: 200 },
  ]);
  assert.deepStrictEqual(datos.especiales.map(e => [e.nombre, e.rolId]), [['Insomnio', 'r-c'], ['Haz hecho un amigo', null], ['???', null]]);
  assert.ok(datos.especiales.every(e => e.descripcion));
  assert.strictEqual(datos.info.usuarios, 1);
  assert.deepStrictEqual(niveles.leer({ levels: {} }, { guild: guildFalso() }).niveles, []);
});

test('niveles: validar cada regla de las filas y de los especiales', () => {
  const guild = guildFalso();
  const fila = (cambios) => ({ nivel: 1, nombre: 'Novato', rolId: 'r-a', horasVoz: 1, mensajes: 0, ...cambios });
  const casos = [
    [fila({ nivel: 0 }), 'niveles.0.nivel', /entre 1 y 100/],
    [fila({ nivel: null }), 'niveles.0.nivel', /entero/],
    [fila({ nombre: '???' }), 'niveles.0.nombre', /reservado/],
    [fila({ rolId: null }), 'niveles.0.rolId', /Elige el rol/],
    [fila({ rolId: 'r-alto' }), 'niveles.0.rolId', /por encima/],
    [fila({ horasVoz: 0, mensajes: 0 }), 'niveles.0.horasVoz', /mayores que 0/],
    [fila({ mensajes: 1.5 }), 'niveles.0.mensajes', /entero/],
  ];
  for (const [f, clave, texto] of casos) {
    assert.match(niveles.validar({ niveles: [f] }, { guild }).errores[clave], texto, clave);
  }
  const repetido = niveles.validar({ niveles: [fila(), fila({ nombre: 'Otro', rolId: 'r-b' })] }, { guild });
  assert.match(repetido.errores['niveles.1.nivel'], /fila 1/);
  assert.match(niveles.validar({ especiales: [{ rolId: 'r-alto' }] }, { guild }).errores['especiales.0.rolId'], /por encima/);
  const vacio = niveles.validar({}, { guild });
  assert.deepStrictEqual(vacio, { valores: { canal: null, niveles: [], especiales: [null, null, null] }, errores: {} });
});

test('niveles: guardar conserva el progreso y deja los especiales sin número de nivel', () => {
  const guild = guildFalso();
  const datos = datosNiveles();
  const { valores, errores } = niveles.validar({
    canal: 'c2',
    niveles: [{ nivel: 5, nombre: 'Veterano', rolId: 'r-b', horasVoz: 20, mensajes: 500 }, { nivel: 1, nombre: 'Novato', rolId: 'r-a', horasVoz: '2', mensajes: 0 }],
    especiales: [{ rolId: null }, { rolId: 'r-c' }, {}],
  }, { guild });
  assert.deepStrictEqual(errores, {});
  const { levels } = niveles.guardar(valores, datos, { guild });
  assert.deepStrictEqual(levels.usuarios, datos.levels.usuarios, 'no toca el progreso');
  assert.strictEqual(levels.otraClave, true);
  assert.strictEqual(levels.canal_notificaciones, 'c2');
  assert.deepStrictEqual(levels.niveles, [
    { nivel: 1, nombre: 'Novato', rol_id: 'r-a', horas_voz: 2, mensajes: 0, requisito_texto: '2h de voz' },
    { nivel: 5, nombre: 'Veterano', rol_id: 'r-b', horas_voz: 20, mensajes: 500, requisito_texto: '20h de voz y 500 mensajes' },
    { nombre: 'Haz hecho un amigo', rol_id: 'r-c', horas_voz: 0, mensajes: 0, requisito_texto: 'Logro especial' },
  ]);
  assert.ok(!('nivel' in levels.niveles[2]), 'un logro especial sin número no entra en la subida de nivel');
});

// ── Auto-respuestas ──

test('autorespuestas: leer, validar y guardar entre lista y objeto', () => {
  assert.deepStrictEqual(autorespuestas.leer({ autorespuestas: { hola: 'hey', gg: 'bien jugado' } }), {
    respuestas: [{ disparador: 'hola', respuesta: 'hey' }, { disparador: 'gg', respuesta: 'bien jugado' }],
  });
  const { valores, errores } = autorespuestas.validar({ respuestas: [
    { disparador: 'hola', respuesta: ' hey ' },
    { disparador: '', respuesta: '' },
    { disparador: 'hola', respuesta: 'otra' },
    { disparador: 'Hola', respuesta: 'con mayúscula' },
    { disparador: 'sin', respuesta: '' },
    { disparador: 'x'.repeat(101), respuesta: 'a' },
    { disparador: 'largo', respuesta: 'y'.repeat(2001) },
    { disparador: '__proto__', respuesta: 'seguro' },
  ] }, {});
  assert.deepStrictEqual(Object.keys(errores).sort(), ['respuestas.2.disparador', 'respuestas.4.respuesta', 'respuestas.5.disparador', 'respuestas.6.respuesta']);
  assert.deepStrictEqual(valores.respuestas.map(r => r.disparador), ['hola', 'Hola', '__proto__']);
  const { autorespuestas: objeto } = autorespuestas.guardar(valores, { autorespuestas: { viejo: 'x' } }, {});
  assert.deepStrictEqual(Object.keys(objeto), ['hola', 'Hola', '__proto__']);
  assert.strictEqual(objeto.hola, 'hey');
  assert.ok(Object.hasOwn(objeto, '__proto__'));
  assert.strictEqual(Object.getPrototypeOf(objeto), Object.prototype);
});

test('autorespuestas: conserva los espacios del disparador (sirven para coincidir palabras enteras)', () => {
  const { valores, errores } = autorespuestas.validar({ respuestas: [{ disparador: ' gg ', respuesta: ' bien jugado ' }, { disparador: 'gg', respuesta: 'otra' }] }, {});
  assert.deepStrictEqual(errores, {});
  assert.deepStrictEqual(valores.respuestas, [{ disparador: ' gg ', respuesta: 'bien jugado' }, { disparador: 'gg', respuesta: 'otra' }]);
});
