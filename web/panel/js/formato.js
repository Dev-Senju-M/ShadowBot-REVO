// Formato básico de Discord para la vista previa, siempre escapando el HTML.
// Se usa en el navegador (window.Formato) y en los tests de Node (module.exports).
(function (raiz) {
  function escapar(texto) {
    return String(texto ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Recibe texto YA escapado y aplica negrita, cursiva, subrayado, tachado y código
  function enLinea(texto) {
    return texto
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/__([^_\n]+)__/g, '<u>$1</u>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  }

  // Convierte el mensaje a HTML seguro. {user} → mención; {tag} → nombre
  function formatearMensaje(texto, { usuario = 'usuario', tag = 'usuario' } = {}) {
    const mencion = `<span class="mencion">@${escapar(usuario)}</span>`;
    const lineas = escapar(texto).split('\n');
    return lineas.map((linea, i) => {
      const encabezado = linea.match(/^(#{1,3}) (.*)$/);
      const html = enLinea(encabezado ? encabezado[2] : linea)
        .replace(/\{user\}/g, mencion)
        .replace(/\{tag\}/g, escapar(tag));
      if (encabezado) return `<div class="h${encabezado[1].length}">${html}</div>`;
      return i < lineas.length - 1 ? `${html}<br>` : html;
    }).join('');
  }

  const api = { escapar, formatearMensaje };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else raiz.Formato = api;
})(typeof window !== 'undefined' ? window : globalThis);
