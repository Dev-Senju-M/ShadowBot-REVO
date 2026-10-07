// Lógica pura de buscar grupo y salas temporales (src/utils/grupos.js).
// No toca Discord ni la base de datos. Ejecutar con: npm test
const { test } = require('node:test');
const assert = require('node:assert');
const G = require('../src/utils/grupos');

const anuncio = (cupos = 3) => G.crearAnuncio({ juego: 'Fortnite', creadorId: 'creador', cupos, nota: '', canalId: 'c1', ahora: 1000 });

test('crearAnuncio: el creador es el primer miembro y expira a los 60 min', () => {
  const a = anuncio();
  assert.deepStrictEqual(a.miembros, ['creador']);
  assert.strictEqual(a.estado, 'abierto');
  assert.strictEqual(a.expiraEn, 1000 + 60 * 60 * 1000);
  assert.strictEqual(a.nota, null);
});

test('unirse: agrega, rechaza duplicados y marca iniciando al llenarse', () => {
  const a = anuncio(3);
  assert.deepStrictEqual(G.unirse(a, 'u1'), { ok: true, lleno: false });
  assert.strictEqual(G.unirse(a, 'u1').ok, false);
  assert.strictEqual(G.unirse(a, 'creador').ok, false);
  assert.deepStrictEqual(G.unirse(a, 'u2'), { ok: true, lleno: true });
  assert.strictEqual(a.estado, 'iniciando');
  assert.strictEqual(G.unirse(a, 'u3').ok, false, 'no se puede unir a un grupo que ya inicia');
});

test('unirse: rechaza si el grupo está lleno aunque siga abierto', () => {
  const a = anuncio(2);
  a.miembros.push('u1'); // lleno pero abierto (p. ej. tras fallar la creación de la sala)
  const r = G.unirse(a, 'u2');
  assert.strictEqual(r.ok, false);
  assert.match(r.error, /lleno/);
});

test('salir: el creador no puede, un miembro sí, un ajeno no', () => {
  const a = anuncio(4);
  G.unirse(a, 'u1');
  assert.strictEqual(G.salir(a, 'creador').ok, false);
  assert.strictEqual(G.salir(a, 'ajeno').ok, false);
  assert.strictEqual(G.salir(a, 'u1').ok, true);
  assert.deepStrictEqual(a.miembros, ['creador']);
});

test('empezar: solo el creador y con al menos 2 personas', () => {
  const a = anuncio(4);
  assert.strictEqual(G.empezar(a, 'creador').ok, false, 'solo hay 1 persona');
  G.unirse(a, 'u1');
  assert.strictEqual(G.empezar(a, 'u1').ok, false, 'no es el creador');
  assert.strictEqual(G.empezar(a, 'creador').ok, true);
  assert.strictEqual(a.estado, 'iniciando');
  assert.strictEqual(G.empezar(a, 'creador').ok, false, 'ya no está abierto');
});

test('anuncioDeCreador: encuentra el anuncio activo del usuario', () => {
  const a = anuncio();
  const anuncios = { [a.id]: a };
  assert.strictEqual(G.anuncioDeCreador(anuncios, 'creador'), a);
  assert.strictEqual(G.anuncioDeCreador(anuncios, 'otro'), null);
});

test('anunciosVencidos: solo los que pasaron su plazo', () => {
  const a = anuncio();
  const b = { ...anuncio(), id: 'b', expiraEn: a.expiraEn + 1 };
  const anuncios = { [a.id]: a, b };
  assert.deepStrictEqual(G.anunciosVencidos(anuncios, a.expiraEn - 1), []);
  assert.deepStrictEqual(G.anunciosVencidos(anuncios, a.expiraEn).map(x => x.id), [a.id]);
});

test('juegos: buscar sin distinguir mayúsculas, agregar actualiza, quitar', () => {
  const juegos = [];
  assert.deepStrictEqual(G.agregarJuego(juegos, 'Fortnite', 'r1'), { actualizado: false });
  assert.deepStrictEqual(G.agregarJuego(juegos, 'fortnite', 'r2'), { actualizado: true });
  assert.strictEqual(juegos.length, 1);
  assert.strictEqual(G.buscarJuego(juegos, ' FORTNITE ').rolId, 'r2');
  assert.strictEqual(G.buscarJuego(juegos, 'Valorant'), null);
  assert.strictEqual(G.quitarJuego(juegos, 'Valorant'), false);
  assert.strictEqual(G.quitarJuego(juegos, 'Fortnite'), true);
  assert.strictEqual(juegos.length, 0);
});

test('salaDeDueno: devuelve el canal del dueño o null', () => {
  const salas = { c1: { ownerId: 'a' }, c2: { ownerId: 'b' } };
  assert.strictEqual(G.salaDeDueno(salas, 'b'), 'c2');
  assert.strictEqual(G.salaDeDueno(salas, 'z'), null);
});

test('elegirNuevoDueno: elige un humano distinto del dueño actual, ignora bots', () => {
  assert.strictEqual(G.elegirNuevoDueno([{ id: 'bot', bot: true }, { id: 'h1', bot: false }], 'viejo'), 'h1');
  assert.strictEqual(G.elegirNuevoDueno([{ id: 'viejo', bot: false }, { id: 'bot', bot: true }], 'viejo'), null);
  assert.strictEqual(G.elegirNuevoDueno([], 'viejo'), null);
});
