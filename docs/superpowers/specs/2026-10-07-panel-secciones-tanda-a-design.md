# Diseño: Panel web — subproyecto 2, tanda A (formularios simples)

Fecha: 2026-10-07 · Estado: aprobado en conversación

## Alcance

Subproyecto 2 en dos tandas. **Tanda A (este documento):** secciones Logs, Novedades, Tienda Fortnite, Cumpleaños e IA, más la generalización del contrato de secciones. **Tanda B (otro documento):** editor de listas y las secciones Buscar grupo, Niveles y logros, y Auto-respuestas.

Base: `docs/superpowers/specs/2026-10-07-panel-web-base-design.md`.

## Contrato de secciones (generalizado)

Cada archivo de `src/web/secciones/` exporta:

| Export | Descripción |
|---|---|
| `titulo` | Nombre para el registro de cambios |
| `almacenes` | Almacenes de `db.js` que usa, p. ej. `['config']` |
| `leer(datos, contexto)` | `datos` = `{ <almacén>: valor }`; `contexto` = `{ guild, client }`; devuelve la sección para el panel |
| `validar(body, contexto)` | `{ valores, errores }` |
| `guardar(valores, datos)` | `{ <almacén>: nuevoValor }` solo con los almacenes que cambian |
| `acciones` (opcional) | `{ id: { titulo, ejecutar(body, contexto, datos) → { mensaje, cambios? } } }`; los errores para el usuario se lanzan con `ErrorAccion(mensaje, estado)` |

Validaciones compartidas en `src/web/secciones/comun.js`: `validarCanal`, `validarRol(…, { asignable })`, `validarTexto(…, { min, max })`, `ErrorAccion`. Bienvenida pasa a usarlas y adopta el contrato (`almacenes: ['config']`) sin cambiar su comportamiento.

## API

- `GET /api/config/:seccion` → `leer(cargar(almacenes), contexto)`.
- `PUT /api/config/:seccion` → `validar`; 400 con errores; si no, `guardar`, escribe cada almacén devuelto (solo si está declarado en `almacenes`), registra las diferencias en el canal de seguridad y devuelve la sección.
- `POST /api/config/:seccion/:accion` (nuevo) → ejecuta la acción; guarda `cambios` si los hay; registra "<sección>: <acción>" con el mensaje en el canal de seguridad; responde `{ mensaje, seccion }`. `ErrorAccion` → su estado (400/404/502) con `{ error }`. Exige el encabezado anti-CSRF como todo método que modifica.
- Secciones y acciones se buscan con `Map`/`Object.hasOwn` (nombres como `__proto__` → 404).

## Secciones

| Sección | Almacén | Campos (panel ↔ almacén) | Información | Acción |
|---|---|---|---|---|
| Logs | `config` | `moderacion` ↔ `modLogChannel`, `actividad` ↔ `logsChannel`, `seguridad` ↔ `securityLogChannel` | — | `probar`: embed de prueba en cada canal configurado; informa ✅/❌ por canal; sin canales → 400 |
| Novedades | `config` | `canal` ↔ `novedadesChannel`, `rol` ↔ `novedadesRole` | Versión más nueva de `NOVEDADES.md` (número, fecha, texto), última anunciada, `ANUNCIAR_NOVEDADES` activo, aviso si el rol no es mencionable | `publicar`: publica la versión más nueva con `utils/novedades.publicar` |
| Tienda Fortnite | `config` | `canal` ↔ `fortniteShopChannel` | `FNBR_API_KEY` configurada, `fortniteLastPosted` | `publicar`: `fetchShop` + `buildMessages` y envío al canal; sin key / sin canal → 400; fallo de fnbr → 502 |
| Cumpleaños | `cumpleanos` | `canal` ↔ `canal` | `lista` ordenada por el próximo cumpleaños (hora de Guatemala): id, nombre (apodo en el servidor o tag guardado), día, mes, días que faltan, edad que cumple | `borrar` `{ usuarioId }`; inexistente → 404 |
| IA | `personalidad` | `nombre` (1–32), `personalidad` (1–1500), `modelo` (valores de `MODELOS_VALIDOS`), `activada` (booleano) | `OPENAI_API_KEY` configurada, opciones de modelo con nombre | `restablecer` → `DEFAULT_PERSONALIDAD` |

Reglas: canales como en Bienvenida (texto/anuncios, el bot puede escribir, vacío = desactivado); rol de Novedades existe y no es @everyone (no hace falta que sea asignable); `modelo` fuera de la lista → error; `activada` debe ser booleano.

## Frontend

- `js/formulario.js`: motor de formularios declarativos. Tipos de campo: `canal`, `rol`, `texto`, `area`, `opciones`, `interruptor`. Incluye cambios sin guardar, errores por campo, columna lateral (`lateral(datos)`), bloque extra (`extra(datos)`), buscador genérico (`[data-buscar]` filtra `[data-fila]` por `data-texto`) y acciones.
- Acciones: botones secundarios; las que tienen consecuencias piden confirmación con `js/dialogo.js` (`<dialog>` nativo con la mascota; Esc cancela). Con cambios sin guardar las acciones se desactivan ("Guarda o descarta primero").
- Una sección por archivo: `js/secciones/logs.js`, `novedades.js`, `fortnite.js`, `cumpleanos.js`, `ia.js`. Novedades muestra la vista previa del texto con `Formato.formatearMensaje`.
- Barra lateral agrupada: Inicio · **Servidor** (Bienvenida, Logs, Cumpleaños) · **Comunidad** (Novedades, Tienda Fortnite, IA). Inicio lista todas las secciones.
- Iconos kawaii nuevos: `pastel` (Cumpleaños) y `tienda` (Fortnite); icono de línea `borrar`.
- `Api.post(ruta, datos)`.

## Errores

Acciones fallidas → aviso con la mascota triste y el motivo; nada de lo escrito se pierde. Borrar un cumpleaños inexistente → aviso y recarga de la sección.

## Tests

- `test/panel-secciones.test.js`: `leer`/`validar`/`guardar` y acciones de las 5 secciones con servidor y canales falsos; publicaciones sin red (funciones de `utils/novedades` y `utils/fortnite-shop` sustituidas en el test).
- `test/panel-bienvenida.test.js`: adaptado a la firma nueva.
- `test/panel-api.test.js`: almacenes en memoria por nombre; `PUT` de IA guarda en `personalidad`; acción inexistente/`__proto__` → 404; sin encabezado → 403; `cumpleanos/borrar` → 200 y 404.
- Navegador: vista previa con bot falso y datos de ejemplo para las 5 secciones, escritorio y móvil.

## Fuera de alcance (tanda B u otros)

Editor de listas, Buscar grupo, Niveles y logros, Auto-respuestas; probar la IA desde el panel; editar fechas de cumpleaños.
