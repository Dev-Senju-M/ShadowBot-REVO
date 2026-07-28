const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../torneos.json');

function getDB() {
    if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ torneos: {} }, null, 2));
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
}

function saveDB(db) {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

function genId(prefix = 't') {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function getTorneosGuild(guildId) {
    const db = getDB();
    if (!db.torneos[guildId]) db.torneos[guildId] = [];
    return db.torneos[guildId];
}

function guardarTorneosGuild(guildId, lista) {
    const db = getDB();
    db.torneos[guildId] = lista;
    saveDB(db);
}

// Busca un torneo por nombre (case-insensitive). Si no se da nombre, devuelve
// el único torneo activo (inscripciones/en_curso) si solo hay uno, si no null.
function buscarTorneo(guildId, nombre) {
    const lista = getTorneosGuild(guildId);
    if (nombre) {
        return lista.find(t => t.nombre.toLowerCase() === nombre.toLowerCase()) || null;
    }
    const activos = lista.filter(t => t.estado === 'inscripciones' || t.estado === 'en_curso');
    return activos.length === 1 ? activos[0] : null;
}

function guardarTorneo(guildId, torneo) {
    const lista = getTorneosGuild(guildId);
    const idx = lista.findIndex(t => t.id === torneo.id);
    if (idx === -1) lista.push(torneo);
    else lista[idx] = torneo;
    guardarTorneosGuild(guildId, lista);
}

function crearTorneo({ guildId, nombre, juego, formato, modo, tamanoEquipo, canalId, organizadorId }) {
    const torneo = {
        id: genId('trn'),
        guildId,
        nombre,
        juego,
        formato, // 'eliminacion' | 'puntos'
        modo, // 'equipos' | 'individual'
        tamanoEquipo: modo === 'equipos' ? (tamanoEquipo || 2) : 1,
        estado: 'inscripciones', // inscripciones | en_curso | finalizado | cancelado
        canalId,
        organizadorId,
        creadoEn: Date.now(),
        participantes: [],
        ronda: 0,
        llaves: [],
        ganadorFinal: null,
        puntosConfig: { porKill: 1, porPosicion: { '1': 10, '2': 6, '3': 5, '4': 4, '5': 3, '6': 2, '7': 1, '8': 1 } },
        partidas: [],
        pendientes: [],
    };
    guardarTorneo(guildId, torneo);
    return torneo;
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function nombreParticipante(torneo, participanteId) {
    if (!participanteId) return 'BYE';
    const p = torneo.participantes.find(p => p.id === participanteId);
    return p ? p.nombre : 'Desconocido';
}

// Genera la ronda 1 del bracket de eliminación directa, con BYEs si el
// número de participantes no es potencia de 2.
function generarLlaves(torneo) {
    const mezclados = shuffle(torneo.participantes.map(p => p.id));
    let tamanoBracket = 1;
    while (tamanoBracket < mezclados.length) tamanoBracket *= 2;

    const byes = tamanoBracket - mezclados.length;
    const llaves = [];
    let numero = 1;

    // Los primeros `byes` participantes pasan directo (llave contra null).
    for (let i = 0; i < byes; i++) {
        llaves.push({
            id: genId('m'),
            ronda: 1,
            numero: numero++,
            a: mezclados[i],
            b: null,
            ganador: mezclados[i],
            estado: 'confirmado',
        });
    }

    // El resto se empareja normalmente, de dos en dos (sin huecos).
    const restantes = mezclados.slice(byes);
    for (let i = 0; i < restantes.length; i += 2) {
        llaves.push({
            id: genId('m'),
            ronda: 1,
            numero: numero++,
            a: restantes[i],
            b: restantes[i + 1] ?? null,
            ganador: null,
            estado: 'pendiente',
        });
    }

    torneo.ronda = 1;
    torneo.llaves = llaves;
    torneo.estado = 'en_curso';
    return torneo;
}

function llavesDeRonda(torneo, ronda) {
    return torneo.llaves.filter(l => l.ronda === ronda);
}

// Revisa si la ronda actual está completa; si lo está, genera la siguiente
// ronda o declara ganador final si ya no queda más que un equipo.
function avanzarSiCorresponde(torneo) {
    const rondaActual = llavesDeRonda(torneo, torneo.ronda);
    const pendientes = rondaActual.filter(l => l.estado !== 'confirmado');
    if (pendientes.length > 0) return torneo;

    const ganadores = rondaActual.map(l => l.ganador);

    if (ganadores.length === 1) {
        torneo.estado = 'finalizado';
        torneo.ganadorFinal = ganadores[0];
        return torneo;
    }

    const nuevaRonda = torneo.ronda + 1;
    const llaves = [];
    let numero = 1;
    for (let i = 0; i < ganadores.length; i += 2) {
        const a = ganadores[i];
        const b = ganadores[i + 1];
        const llave = {
            id: genId('m'),
            ronda: nuevaRonda,
            numero: numero++,
            a,
            b,
            ganador: null,
            estado: 'pendiente',
        };
        if (a && !b) { llave.ganador = a; llave.estado = 'confirmado'; }
        if (b && !a) { llave.ganador = b; llave.estado = 'confirmado'; }
        llaves.push(llave);
    }
    torneo.ronda = nuevaRonda;
    torneo.llaves = torneo.llaves.concat(llaves);

    // Si la ronda recién creada resultó completa solo por BYEs, seguimos avanzando.
    return avanzarSiCorresponde(torneo);
}

// Calcula puntos totales por participante para torneos de formato "puntos".
function calcularTabla(torneo) {
    const totales = {};
    for (const p of torneo.participantes) totales[p.id] = { participanteId: p.id, nombre: p.nombre, puntos: 0, kills: 0, partidasJugadas: 0 };

    for (const partida of torneo.partidas) {
        for (const rep of partida.reportes) {
            if (!rep.confirmado) continue;
            if (!totales[rep.participanteId]) continue;
            totales[rep.participanteId].puntos += rep.puntos;
            totales[rep.participanteId].kills += rep.kills;
            totales[rep.participanteId].partidasJugadas += 1;
        }
    }

    return Object.values(totales).sort((a, b) => b.puntos - a.puntos || b.kills - a.kills);
}

function calcularPuntosReporte(torneo, kills, posicion) {
    const cfg = torneo.puntosConfig;
    const porPos = cfg.porPosicion[String(posicion)] || 0;
    return kills * cfg.porKill + porPos;
}

// Verifica si un usuario pertenece a un participante (capitán o miembro, o si es individual, el mismo usuario)
function usuarioEsDelParticipante(torneo, participanteId, userId) {
    const p = torneo.participantes.find(p => p.id === participanteId);
    if (!p) return false;
    if (torneo.modo === 'individual') return p.miembros.includes(userId);
    return p.capitanId === userId || p.miembros.includes(userId);
}

function participanteDeUsuario(torneo, userId) {
    return torneo.participantes.find(p => p.capitanId === userId || p.miembros.includes(userId)) || null;
}

module.exports = {
    getDB,
    saveDB,
    genId,
    getTorneosGuild,
    guardarTorneosGuild,
    buscarTorneo,
    guardarTorneo,
    crearTorneo,
    shuffle,
    nombreParticipante,
    generarLlaves,
    llavesDeRonda,
    avanzarSiCorresponde,
    calcularTabla,
    calcularPuntosReporte,
    usuarioEsDelParticipante,
    participanteDeUsuario,
};