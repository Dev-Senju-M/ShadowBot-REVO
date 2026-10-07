# Diseño: Buscar grupo y salas de voz temporales

Fecha: 2026-10-07 · Estado: aprobado en conversación, pendiente de revisión escrita

## Objetivo

Que los miembros del servidor encuentren con quién jugar y terminen juntos en un canal de voz:

1. **Buscar grupo:** `/buscar-grupo` publica un anuncio con botones; cuando el grupo se completa, el bot crea una sala de voz para ese grupo.
2. **Salas temporales:** al entrar a "➕ Crear sala" cada persona obtiene su propia sala de voz, que se borra al quedar vacía.

Ambos sistemas comparten un único mecanismo de "sala temporal".

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Juegos y roles | Lista configurada por admins (juego → rol). El juego se elige de esa lista y se menciona su rol. |
| Canal de anuncios | Un canal fijo configurado por admins. |
| Sala del grupo | Se crea al llenarse los cupos o cuando el creador pulsa "Empezar ya". Abierta a todos, con límite de usuarios = cupos. |
| Control de salas | Básico: renombrar, límite, bloquear/desbloquear. La propiedad pasa a otro miembro si el dueño se va. |
| Caducidad | Un anuncio sin completar expira a los 60 minutos. |
| Estado | Persistido en la base de datos (almacén `grupos` en `db.js`), reconciliado al arrancar. |

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `src/utils/grupos.js` | Acceso al almacén `grupos` y lógica pura (sin Discord): unirse, salir, empezar, caducidad, elegir nuevo dueño, validar juegos. |
| `src/utils/grupos-embeds.js` | Embeds y botones de los anuncios (los usan el comando y el evento). |
| `src/utils/salas.js` | Operaciones de Discord compartidas sobre salas: crear y registrar una sala, humanos en un canal, mensaje de error de permisos. |
| `src/commands/setup-grupos.js` | Configuración (Administrador): canal de anuncios, crear categoría de salas, gestionar lista de juegos. |
| `src/commands/buscar-grupo.js` | `/buscar-grupo` con autocompletado de juegos. |
| `src/commands/sala.js` | `/sala` — controles del dueño de una sala temporal. |
| `src/events/buscar-grupo-panel.js` | Botones de los anuncios, revisión de caducidad cada minuto, reconciliación de anuncios al arrancar. |
| `src/events/salas-temporales.js` | Crear sala al entrar a "➕ Crear sala", borrar salas vacías, traspasar propiedad, limpieza periódica y al arrancar. |
| `src/utils/db.js` | Registrar el almacén `grupos` (plantilla `data/grupos.example.json`). |
| `test/grupos.test.js` | Tests de la lógica pura. |

Los comandos y eventos nuevos se cargan solos (carga automática de `src/commands` y `src/events`).

## Modelo de datos (almacén `grupos`)

```js
{
  guilds: {
    "<guildId>": {
      config: { canalAnuncios: null, categoriaSalas: null, canalCrearSala: null },
      juegos: [{ nombre: "Fortnite", rolId: "<roleId>" }],
      anuncios: {
        "<anuncioId>": {
          id, juego, creadorId, cupos, nota,
          miembros: ["<userId>", ...],   // incluye al creador, que va primero
          canalId, mensajeId,
          creadoEn, expiraEn,            // ms epoch; expiraEn = creadoEn + 60 min
          estado: "abierto" | "iniciando"
        }
      },
      salas: {
        "<channelId>": { ownerId, tipo: "crear-sala" | "grupo", creadaEn }
      }
    }
  }
}
```

- Solo se guardan anuncios activos (`abierto` o `iniciando`). Al completarse, cancelarse o expirar se eliminan del almacén.
- `data/grupos.example.json` contiene `{ "guilds": {} }`.

## Configuración: `/setup-grupos` (Administrador)

| Subcomando | Efecto |
|---|---|
| `canal canal:#canal` | Guarda el canal de anuncios. |
| `salas` | Crea la categoría "🎮 Salas" con el canal de voz "➕ Crear sala" dentro y los guarda. Si ya existían y siguen presentes, informa en vez de duplicarlos. |
| `juego-agregar nombre: rol:@rol` | Agrega o actualiza un juego. Avisa si el rol no es mencionable y el bot no tiene "Mencionar a todos" (la mención no notificaría). |
| `juego-quitar nombre:` | Quita un juego (autocompletado). |
| `juegos` | Lista los juegos configurados y la configuración actual. |

Los subcomandos verifican que el bot tenga "Gestionar canales" cuando hace falta y lo informan con un mensaje claro.

## Flujo: `/buscar-grupo`

**Comando:** `/buscar-grupo juego:<autocompletado> cupos:<2–10> nota:<opcional, máx. 100 caracteres>`

- `cupos` es el tamaño total del grupo, incluyendo al creador.
- Validaciones (respuesta efímera en caso de error): canal de anuncios configurado; juego existente en la lista; el usuario no tiene ya un anuncio activo como creador.
- Unirse a anuncios de otros no está restringido.

**Anuncio** en el canal fijo:
- Contenido: mención solo del rol del juego (`allowedMentions: { roles: [rolId] }`).
- Embed: juego, creador, nota, miembros `n/cupos` con su lista, expiración relativa (`<t:...:R>`).
- Botones (customId `gr_<acción>_<anuncioId>`):

| Botón | Quién | Efecto |
|---|---|---|
| Me uno | Quien no esté en el grupo | Agrega al miembro; si se completa, inicia el grupo. |
| Salir | Miembros salvo el creador | Quita al miembro. |
| Empezar ya | Solo el creador, con ≥ 2 miembros | Inicia el grupo con quienes haya. |
| Cancelar | Creador o moderador (Gestionar mensajes) | Cierra el anuncio como cancelado. |

- Al creador se le responde de forma efímera con el enlace al anuncio.

**Inicio del grupo** (al completarse o con "Empezar ya"):
1. El anuncio pasa a `iniciando` de forma síncrona, antes de cualquier llamada a Discord (evita salas duplicadas por clics simultáneos).
2. Se crea el canal de voz "🎮 <juego> · <nombre del creador>" en la categoría de salas (si no hay categoría configurada, en la categoría del canal de anuncios), con `userLimit = cupos`.
3. Se registra en `salas` con `tipo: "grupo"` y `ownerId = creador`.
4. El anuncio se edita a "✅ Grupo listo → #sala" con botones desactivados, y se elimina del almacén.
5. Se envía un mensaje mencionando a los miembros: "¡Su sala está lista! → #sala". No se mueve a nadie.
6. Si la creación del canal falla (p. ej. permisos), el anuncio vuelve a `abierto` y se informa al usuario.

**Caducidad:** cada minuto, los anuncios con `expiraEn` vencido (incluidos los que quedaron atascados en `iniciando` por un reinicio a mitad de la creación de la sala) se editan a "⌛ Expirado" con botones desactivados y se eliminan del almacén.

## Flujo: salas temporales

**Entrar a "➕ Crear sala":**
- Si el usuario ya es dueño de una sala existente, se le mueve a ella.
- Si no, se crea "🔊 Sala de <nombre>" en la categoría de salas, se registra (`tipo: "crear-sala"`) y se mueve al usuario.
- Espera de 10 segundos por usuario entre creaciones (en memoria). Si entra durante la espera, el bot no hace nada en ese momento: el usuario queda en "➕ Crear sala" y la limpieza del minuto siguiente lo procesa. No se envían mensajes directos.

**Salir de una sala temporal** (`voiceStateUpdate`):
- Si no quedan miembros humanos (los bots no cuentan) → se borra el canal y su registro.
- Si se fue el dueño y quedan humanos → la propiedad pasa a uno de los humanos restantes y se anuncia en el chat del canal: "👑 Ahora @X es dueño de la sala".

**Limpieza cada minuto y al arrancar:**
- Sala registrada cuyo canal ya no existe → se quita del registro.
- Sala vacía con más de 5 minutos desde su creación → se borra (cubre salas de grupo a las que nadie entró y salas vaciadas durante un reinicio).
- Sala cuyo dueño no está dentro pero tiene humanos → se traspasa.
- Usuarios que estén en "➕ Crear sala" (por la espera o porque entraron con el bot apagado) se procesan como si acabaran de entrar.
- También se escucha `channelDelete` para quitar del registro salas borradas a mano.

**Seguridad:** el bot solo borra canales registrados en `salas`. Nunca toca otros canales, aunque estén en la misma categoría.

## Controles: `/sala` (solo el dueño, estando dentro de su sala)

| Subcomando | Efecto |
|---|---|
| `nombre texto:` | Renombra (máx. 100 caracteres). Si Discord limita (2 cambios cada 10 min por canal), se informa claramente. |
| `limite numero:<0–99>` | Fija el límite de usuarios; 0 = sin límite. |
| `bloquear` | Niega "Conectar" a @everyone en ese canal y lo permite explícitamente al dueño y a quienes estén dentro en ese momento (así pueden reconectarse si se caen). |
| `desbloquear` | Quita la restricción a @everyone y los permisos explícitos que agregó `bloquear`. |

Respuestas efímeras. Errores: no estás en una sala temporal / no eres el dueño.

## Manejo de errores

- **Permisos faltantes** (Gestionar canales, Mover miembros): mensaje claro al usuario y registro en el log; nunca excepciones sin capturar.
- **Mensaje de anuncio borrado a mano:** las ediciones fallan en silencio y el anuncio se limpia al expirar o cancelarse.
- **Canal borrado a mano:** se limpia del registro (evento `channelDelete` y limpieza periódica).
- **Concurrencia:** toda modificación del estado (reservar cupo, pasar a `iniciando`, registrar sala) ocurre de forma síncrona sobre el almacén antes de cualquier `await` a Discord.

## Permisos del bot

Gestionar canales, Mover miembros, Gestionar roles (para que `/sala bloquear` pueda editar los permisos del canal) y, para notificar roles no mencionables, Mencionar a todos. Se documentan en el README.

## Tests (`test/grupos.test.js`, sin Discord)

Sobre las funciones puras de `src/utils/grupos.js`:
- Unirse: rechaza duplicados, anuncios llenos o no abiertos; completar cupos indica que hay que iniciar.
- Salir: el creador no puede salir.
- Empezar ya: requiere al menos 2 miembros y ser el creador.
- Un anuncio activo por creador.
- Caducidad: detecta anuncios vencidos.
- Nuevo dueño: elige un humano restante, ignora bots, devuelve nulo si no hay.
- Juegos: rechaza juegos inexistentes; agregar uno existente lo actualiza.

El test de estructura existente valida automáticamente los comandos y eventos nuevos.

## Fuera de alcance

- Mover a los miembros a la sala automáticamente.
- Invitar o expulsar personas concretas de una sala; ocultar salas.
- Estadísticas o historial de grupos.
- Duración de anuncios configurable.
