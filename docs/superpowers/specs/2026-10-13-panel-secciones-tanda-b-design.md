# Diseño: Panel web — subproyecto 2, tanda B (listas)

Fecha: 2026-10-13 · Estado: aprobado en conversación

Continúa `2026-10-07-panel-secciones-tanda-a-design.md`. Agrega un editor de listas reutilizable y las secciones Buscar grupo, Niveles y logros, y Auto-respuestas.

## Decisiones

| Tema | Decisión |
|---|---|
| Edición de listas | Filas editables en la propia página; "+ Agregar" y borrar por fila; todo se guarda con la barra de Guardar existente. |
| Logros especiales | "Insomnio", "Haz hecho un amigo" y "???" aparecen aparte con el nombre bloqueado; solo se elige su rol (sin rol = desactivado). |
| Implementación | Tipo de campo `lista` en `formulario.js` + `validarLista` en `comun.js`. |

## Campo `lista` (frontend)

Declaración: `{ ruta, tipo: 'lista', etiqueta, clase, columnas: [{ clave, tipo, etiqueta, … }], nuevo(filas) → fila, textoAgregar, maximo, fija? }`.

- Tipos de columna: `texto`, `numero` (min/max), `rol` (asignable o no), `canal`, `area`, `fijo` (texto de solo lectura con `detalle` opcional).
- Escritorio: tabla con una cabecera de columnas. Móvil (< 900 px): cada fila es una tarjeta con la etiqueta de cada celda.
- "+ Agregar" añade `nuevo(filas)`, enfoca su primer campo y se desactiva al llegar a `maximo`. Borrar una fila no pide confirmación (no se guarda hasta pulsar Guardar; se puede Descartar).
- `fija: true`: sin agregar ni borrar (logros especiales).
- Errores por celda con la clave `ruta.indice.columna`; la fila con errores se resalta; el error general de la lista (`ruta`) va debajo.
- Los selectores muestran "(ya no existe)" si el canal o rol guardado desapareció de Discord.
- Secciones con listas usan el formulario a todo el ancho (`ancho: true`), con la columna lateral debajo.
- Las acciones pueden ocultarse según los datos (`oculta(datos)`).

## Validación de listas (servidor)

`validarLista(filas, errores, ruta, { maximo, esVacia, validarFila, claveUnica })` en `comun.js`:

- No es una lista → error en `ruta`. Más de `maximo` filas útiles → error en `ruta`.
- Las filas vacías (`esVacia`) se descartan sin error.
- `validarFila(fila, prefijo)` valida cada celda y anota errores en `prefijo.columna` (el índice es el de la lista recibida).
- `claveUnica(fila) → [columna, clave]`: la segunda aparición de una clave recibe "Repetido: ya está en la fila N".
- Devuelve solo las filas válidas.

También `validarNumero(valor, errores, campo, { min, max })` (enteros) y `enBlanco(v)`.

Cambio de contrato: `guardar(valores, datos, contexto)` recibe el contexto (hace falta el servidor en Buscar grupo).

## Secciones

### Buscar grupo — almacén `grupos` (datos del servidor del panel)

| Panel | Almacén | Reglas |
|---|---|---|
| `canal` | `config.canalAnuncios` | Canal de texto donde el bot pueda escribir; vacío = desactivado |
| `juegos[] { nombre, rolId }` | `juegos[]` | Nombre 1–50, único sin distinguir mayúsculas; rol obligatorio, no @everyone (no hace falta que sea asignable); máximo 25 |

- `info`: `salasListas`, nombre del canal "Crear sala", anuncios y salas abiertos, juegos cuyo rol no es mencionable.
- Guardar no toca `anuncios`, `salas` ni el resto de `config`, ni los datos de otros servidores.
- Acción `crearSalas`: igual que `/setup-grupos salas`. Como espera a Discord, escribe con `G.update` después de crear los canales (no devuelve `cambios`) para no pisar cambios hechos por los eventos mientras tanto. Ya configuradas → 400; sin Gestionar canales → 400; fallo de Discord → 502. Se oculta en el panel cuando las salas ya existen.
- `utils/grupos.js` exporta `guildVacio`.

### Niveles y logros — almacén `levels`

| Panel | Almacén | Reglas |
|---|---|---|
| `canal` | `canal_notificaciones` | Canal de texto; vacío = sin avisos |
| `niveles[] { nivel, nombre, rolId, horasVoz, mensajes }` | `niveles[]` con `nivel` numérico | `nivel` entero 1–100 único; nombre 1–50 y distinto de los reservados; rol obligatorio y asignable; horas 0–10 000; mensajes 0–1 000 000; al menos uno > 0; máximo 50 |
| `especiales[3] { nombre, descripcion, rolId }` | `niveles[]` con el nombre reservado y **sin** `nivel` | Rol opcional y asignable; sin rol = no se guarda (desactivado) |

- Logros especiales y cómo se consiguen: Insomnio (40 min en voz entre las 12 y las 4 a. m. con alguien más), Haz hecho un amigo (estar en voz con un bot), ??? (1500 mensajes, 20 h de voz y 30 días seguidos).
- Al guardar: se conserva `usuarios` y cualquier otra clave; cada entrada lleva `requisito_texto` generado (p. ej. "10h y 200 mensajes"; "Logro especial") para `/achievement list`.
- Los especiales sin `nivel` no entran en el cálculo de subida de nivel (`typeof nivel === 'number'`).
- `leer` ordena los niveles por número. `info.usuarios` = cuántos tienen progreso.
- `/levels list` pasa a mostrar solo entradas con `nivel` numérico.

### Auto-respuestas — almacén `autorespuestas`

| Panel | Almacén | Reglas |
|---|---|---|
| `respuestas[] { disparador, respuesta }` | objeto `{ disparador: respuesta }` | Disparador 1–100, único (exacto); respuesta 1–2000; máximo 100 |

Nota fija en el panel: se activa si el mensaje **contiene** el texto, distingue mayúsculas, y solo responde la primera coincidencia. El comportamiento del bot no cambia.

## Frontend

- `js/secciones/grupos.js`, `niveles.js`, `autorespuestas.js`; estilos en `web/panel/listas.css`.
- Barra lateral, grupo Comunidad: Buscar grupo (icono `grupos`), Niveles (`niveles`), Auto-respuestas (icono kawaii nuevo `chat`). Icono de línea nuevo `agregar`.

## Tests

- `test/panel-listas.test.js`: `validarLista`, `validarNumero`, y las tres secciones (leer, validar, guardar, `crearSalas` con servidor falso; conservación de `usuarios`, anuncios y salas; nombres reservados; especiales sin `nivel`; disparador `__proto__`).
- `test/panel-api.test.js`: `PUT` de las tres secciones guarda en su almacén.
- Navegador: agregar, editar y borrar filas; errores por celda; logros especiales; móvil.

## Fuera de alcance

Reordenar filas arrastrando; editar el progreso de usuarios; cambiar cómo coincide una auto-respuesta; quitar roles ya otorgados al borrar un nivel.
