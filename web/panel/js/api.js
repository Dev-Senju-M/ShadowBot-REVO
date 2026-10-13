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
