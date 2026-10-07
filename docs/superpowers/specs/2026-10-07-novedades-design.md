# Diseño: Anuncio automático de novedades del bot

Fecha: 2026-10-07 · Estado: aprobado en conversación

## Objetivo

Cada vez que se despliega una versión nueva del bot, publicar automáticamente en un canal de Discord sus novedades, escritas para la comunidad. El primer anuncio es una presentación completa del bot.

## Decisiones tomadas

| Tema | Decisión |
|---|---|
| Contenido | Archivo `NOVEDADES.md` en la raíz del repo, escrito a mano para la comunidad. |
| Detección de versión nueva | La sección de arriba de `NOVEDADES.md` (`## <versión>`) es la versión actual; se anuncia si no se anunció antes. |
| Entorno | Solo publica si `ANUNCIAR_NOVEDADES=true` (activado en Railway, apagado en local). |
| Configuración | `/setup-novedades` (Admin): canal y rol opcional a mencionar. |
| Primer anuncio | La versión `1.0.0` es una presentación completa de todas las funciones del bot. |
| Textos largos | Se dividen por secciones en varios embeds/mensajes; nunca se recorta texto. |

## Formato de `NOVEDADES.md`

```markdown
# Novedades de ShadowBot          ← texto previo a la primera versión: se ignora

## 1.1.0 — 2026-10-20             ← versión más nueva siempre arriba; fecha opcional
### 🎮 Sección                    ← subtítulos y Markdown normal dentro de la versión
- Cambio...

## 1.0.0 — 2026-10-07
...
```

- Un encabezado de versión es una línea `## <versión>` opcionalmente seguida de ` — <fecha>` (se aceptan `—`, `–` o `-`). `###` no es encabezado de versión.
- La fecha solo se muestra en el pie del anuncio.

## Componentes

| Archivo | Responsabilidad |
|---|---|
| `NOVEDADES.md` | Contenido; primera versión `1.0.0` con la presentación completa. |
| `src/utils/novedades.js` | Funciones puras: `parsear`, `pendientes`, `dividirTexto`, `mensajesDeVersion`. Más E/S: `leerVersiones`, `ultimaAnunciada`, `publicar`. |
| `src/events/novedades.js` | Al arrancar, publica las versiones pendientes si `ANUNCIAR_NOVEDADES=true`. |
| `src/commands/setup-novedades.js` | `canal`, `vista-previa`, `publicar`. |
| `test/novedades.test.js` | Tests de las funciones puras y del `NOVEDADES.md` real. |
| `.env.example`, `README.md` | Variable nueva y documentación. |

La configuración se guarda en el almacén `config` (como los demás `/setup-*`): `novedadesChannel`, `novedadesRole`, `novedadesVersion` (última versión anunciada).

## Qué se anuncia (`pendientes`)

Con las versiones del archivo (más nueva primero) y la última anunciada:

- Archivo sin versiones → nada.
- La última anunciada es la más nueva → nada.
- La última anunciada existe más abajo → todas las más nuevas que ella, de la más vieja a la más nueva, máximo 5 (las 5 más recientes).
- No hay versión anunciada, o ya no existe en el archivo → solo la más nueva.

## Armado de mensajes

- `dividirTexto(texto, 4096)`: separa por secciones (líneas que empiezan con `### `); una sección más larga que el límite se parte por líneas (y una línea más larga que el límite, a la fuerza). Luego junta secciones seguidas mientras quepan en 4096 caracteres. No se pierde texto.
- `mensajesDeVersion(v)`: un embed por trozo (color `#9B59B6`). El primero lleva el título `🆕 ShadowBot v<versión>`; el último, el pie `Versión <versión> • <fecha>`. Los embeds se agrupan en mensajes de máximo 10 embeds y 6000 caracteres (título + descripción + pie).
- Al publicar, solo el primer mensaje de cada versión menciona el rol configurado (`allowedMentions` limitado a ese rol).

## Publicación

- **Automática** (`src/events/novedades.js`, en `clientReady`): si `ANUNCIAR_NOVEDADES !== 'true'` no hace nada. Si no, lee el archivo, calcula pendientes y publica.
- `publicar(client, versiones)`: valida que haya canal configurado y que exista; envía cada versión y guarda `novedadesVersion` **después** de enviar cada una. Si algo falla lanza un error con mensaje para el usuario; lo ya enviado queda marcado y el resto se reintenta en el próximo arranque.

## `/setup-novedades` (Administrador)

| Subcomando | Efecto |
|---|---|
| `canal canal:#canal rol:@rol` (rol opcional) | Guarda canal y rol. Rechaza @everyone como rol. Avisa si `ANUNCIAR_NOVEDADES` no está activo en este entorno. |
| `vista-previa` | Muestra, en mensajes efímeros, cómo se verá el anuncio de la versión más nueva. No publica. |
| `publicar` | Publica ya la versión más nueva y la marca como anunciada. |

## Errores

- `NOVEDADES.md` inexistente o sin versiones → log en el arranque; los comandos responden "No hay versiones en NOVEDADES.md".
- Canal sin configurar, borrado o sin permiso de envío → log / respuesta clara; la versión no se marca.

## Tests (`test/novedades.test.js`)

- `parsear`: ignora el texto previo, respeta el orden, fecha opcional, `###` no crea versión, archivo vacío → `[]`.
- `pendientes`: todos los casos de la sección "Qué se anuncia".
- `dividirTexto`: texto corto → un trozo; texto largo → trozos ≤ 4096 sin perder texto.
- `mensajesDeVersion`: mensajes ≤ 10 embeds y ≤ 6000 caracteres; título en el primero, pie en el último.
- El `NOVEDADES.md` real se parsea, tiene al menos una versión, sin versiones repetidas, y sus mensajes respetan los límites.

## Fuera de alcance

- Generar novedades desde los commits.
- Publicar en varios servidores con configuración distinta (el almacén `config` es global, como el resto de `/setup-*`).
