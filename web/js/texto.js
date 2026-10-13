// Utilidades puras de la landing. Navegador (window.Texto) y tests de Node (module.exports).
(function (global) {
  // Devuelve la URL si es una ruta propia (/algo) o http(s); si no, ''.
  // Evita que un config.js mal escrito meta enlaces javascript: o //otro-sitio.
  function urlSegura(valor) {
    if (typeof valor !== 'string') return '';
    const url = valor.trim();
    if (/^\/(?![/\\])/.test(url) || /^https?:\/\/[^\s/]/i.test(url)) return url;
    return '';
  }

  // Minúsculas y sin tildes, para comparar textos
  function normalizar(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  // ¿El texto contiene la búsqueda? Una búsqueda vacía coincide con todo.
  function coincide(texto, busqueda) {
    return normalizar(texto).includes(normalizar(busqueda));
  }

  const api = { urlSegura, normalizar, coincide };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.Texto = api;
})(typeof window !== 'undefined' ? window : globalThis);
