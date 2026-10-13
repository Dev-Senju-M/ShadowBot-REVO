// Sección "grupos": canal de anuncios de /buscar-grupo y lista de juegos.
// El almacén "grupos" guarda los datos por servidor; aquí solo se edita el del panel.
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const G = require('../../utils/grupos');
const { ErrorAccion, enBlanco, vacio, validarCanal, validarRol, validarTexto, validarLista } = require('./comun');

const titulo = 'Buscar grupo';
const almacenes = ['grupos'];
const MAX_JUEGOS = 25; // tope del autocompletado de Discord

function delServidor(grupos, guildId) {
  const guardado = grupos.guilds?.[guildId] ?? {};
  const base = G.guildVacio();
  return { ...base, ...guardado, config: { ...base.config, ...guardado.config } };
}

function conServidor(grupos, guildId, datos) {
  return { ...grupos, guilds: { ...grupos.guilds, [guildId]: datos } };
}

function leer({ grupos }, { guild }) {
  const g = delServidor(grupos, guild.id);
  const canalDe = (id) => (id ? guild.channels.cache.get(id) : null);
  const puedeMencionar = Boolean(guild.members.me.permissions?.has(PermissionFlagsBits.MentionEveryone));
  const rolesNoMencionables = g.juegos
    .filter((juego) => {
      const rol = guild.roles.cache.get(juego.rolId);
      return rol && !rol.mentionable && !puedeMencionar;
    })
    .map(juego => juego.nombre);
  return {
    canal: g.config.canalAnuncios || null,
    juegos: g.juegos.map(juego => ({ nombre: juego.nombre, rolId: juego.rolId })),
    info: {
      salasListas: Boolean(canalDe(g.config.canalCrearSala) && canalDe(g.config.categoriaSalas)),
      canalCrearSala: canalDe(g.config.canalCrearSala)?.name ?? null,
      anunciosAbiertos: Object.keys(g.anuncios).length,
      salasAbiertas: Object.keys(g.salas).length,
      rolesNoMencionables,
    },
  };
}

function validar(body, { guild }) {
  const errores = {};
  const valores = {
    canal: validarCanal(body?.canal, guild, errores, 'canal'),
    juegos: validarLista(body?.juegos, errores, 'juegos', {
      maximo: MAX_JUEGOS,
      esVacia: (fila) => enBlanco(fila.nombre) && vacio(fila.rolId),
      validarFila: (fila, prefijo) => {
        const nombre = validarTexto(fila.nombre, errores, `${prefijo}.nombre`, { min: 1, max: 50 });
        const rolId = validarRol(fila.rolId, guild, errores, `${prefijo}.rolId`, { asignable: false });
        if (!rolId && !errores[`${prefijo}.rolId`]) errores[`${prefijo}.rolId`] = 'Elige el rol que se menciona.';
        return { nombre, rolId };
      },
      claveUnica: (fila) => ['nombre', fila.nombre.toLowerCase()],
    }),
  };
  return { valores, errores };
}

function guardar(valores, { grupos }, { guild }) {
  const g = delServidor(grupos, guild.id);
  return {
    grupos: conServidor(grupos, guild.id, {
      ...g,
      config: { ...g.config, canalAnuncios: valores.canal },
      juegos: valores.juegos,
    }),
  };
}

const acciones = {
  crearSalas: {
    titulo: 'Crear salas',
    async ejecutar(body, { guild }, { grupos }) {
      const g = delServidor(grupos, guild.id);
      let categoria = g.config.categoriaSalas && guild.channels.cache.get(g.config.categoriaSalas);
      let crear = g.config.canalCrearSala && guild.channels.cache.get(g.config.canalCrearSala);
      if (categoria && crear) throw new ErrorAccion('Las salas ya están configuradas.');
      if (!guild.members.me.permissions?.has(PermissionFlagsBits.ManageChannels)) {
        throw new ErrorAccion('El bot necesita el permiso Gestionar canales para crear las salas.');
      }
      try {
        if (!categoria) categoria = await guild.channels.create({ name: '🎮 Salas', type: ChannelType.GuildCategory });
        if (!crear) crear = await guild.channels.create({ name: '➕ Crear sala', type: ChannelType.GuildVoice, parent: categoria.id });
        else await crear.setParent(categoria.id);
      } catch (err) {
        throw new ErrorAccion(`No se pudieron crear los canales: ${err.message}`, 502);
      }
      // Tras esperar a Discord se guarda con G.update (lee de nuevo el almacén)
      // para no pisar lo que los eventos hayan escrito mientras tanto.
      G.update(guild.id, (actual) => {
        actual.config.categoriaSalas = categoria.id;
        actual.config.canalCrearSala = crear.id;
      });
      return { mensaje: 'Listo: al entrar a "➕ Crear sala" cada persona tendrá su propia sala.' };
    },
  },
};

module.exports = { titulo, almacenes, leer, validar, guardar, acciones };
