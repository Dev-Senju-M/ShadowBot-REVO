// Lógica pura de torneos: llaves de eliminación (con BYEs) y puntuación.
// Estas funciones no leen ni escriben datos. Ejecutar con: npm test
const { test } = require('node:test');
const assert = require('node:assert');
const T = require('../src/utils/torneos');

function torneoCon(n) {
  return {
    participantes: Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, nombre: `Jugador ${i + 1}`, miembros: [`u${i + 1}`] })),
    llaves: [],
    ronda: 0,
    estado: 'inscripciones',
    puntosConfig: { porKill: 1, porPosicion: { '1': 10, '2': 6, '3': 5 } },
    partidas: [],
  };
}

// Juega el torneo completo: en cada llave pendiente gana el lado "a"
function jugarHastaElFinal(torneo) {
  for (let guardia = 0; torneo.estado !== 'finalizado'; guardia++) {
    assert.ok(guardia < 50, 'el torneo no termina');
    for (const llave of T.llavesDeRonda(torneo, torneo.ronda)) {
      if (llave.estado !== 'confirmado') {
        llave.ganador = llave.a;
        llave.estado = 'confirmado';
      }
    }
    T.avanzarSiCorresponde(torneo);
  }
}

for (let n = 2; n <= 9; n++) {
  test(`eliminación con ${n} participantes termina con un campeón`, () => {
    const torneo = T.generarLlaves(torneoCon(n));
    assert.strictEqual(torneo.estado, 'en_curso');

    // La ronda 1 incluye a todos los participantes exactamente una vez
    const enRonda1 = T.llavesDeRonda(torneo, 1).flatMap(l => [l.a, l.b]).filter(Boolean).sort();
    assert.deepStrictEqual(enRonda1, torneo.participantes.map(p => p.id).sort());

    T.avanzarSiCorresponde(torneo); // por si la ronda 1 ya está completa solo con BYEs
    jugarHastaElFinal(torneo);

    assert.ok(torneo.participantes.some(p => p.id === torneo.ganadorFinal), 'el campeón no es un participante');
    assert.strictEqual(torneo.ronda, Math.ceil(Math.log2(n)), 'número de rondas incorrecto');
  });
}

test('calcularPuntosReporte suma kills y posición', () => {
  const torneo = torneoCon(2);
  assert.strictEqual(T.calcularPuntosReporte(torneo, 4, 1), 14); // 4 kills + 10 por 1º
  assert.strictEqual(T.calcularPuntosReporte(torneo, 3, 20), 3);  // posición sin puntos
});

test('calcularTabla ignora reportes sin confirmar y ordena por puntos', () => {
  const torneo = torneoCon(2);
  torneo.partidas = [{ numero: 1, reportes: [
    { participanteId: 'p1', kills: 2, posicion: 2, puntos: 8, confirmado: true },
    { participanteId: 'p2', kills: 9, posicion: 1, puntos: 19, confirmado: false },
  ] }];
  const tabla = T.calcularTabla(torneo);
  assert.strictEqual(tabla[0].participanteId, 'p1');
  assert.strictEqual(tabla[0].puntos, 8);
  assert.strictEqual(tabla[1].partidasJugadas, 0);
});
