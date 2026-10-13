// Iconos propios del panel (SVG 24x24). Los de sección son kawaii con contorno
// de tinta (clases .k y .k2 en styles.css); los de formulario son de línea.
const Iconos = (() => {
  const KAWAII = {
    inicio: '<path class="k" d="M4.5 11 12 4.5l7.5 6.5V20h-15z"/><path class="k2" d="M10 20v-3.2a2 2 0 0 1 4 0V20z"/><circle cx="9.6" cy="12.8" r="1" class="tinta"/><circle cx="14.4" cy="12.8" r="1" class="tinta"/><ellipse cx="8.3" cy="14.6" rx="1.1" ry=".6" class="rubor"/><ellipse cx="15.7" cy="14.6" rx="1.1" ry=".6" class="rubor"/>',
    bienvenida: '<path class="k2" d="M5 21V11.5c0-4.2 3.2-7.5 7-8.8 3.8 1.3 7 4.6 7 8.8V21z"/><path class="puerta" d="M8.5 21v-7.5a3.5 3.5 0 0 1 7 0V21z"/><circle cx="10.6" cy="15" r=".9" class="ojo-brillo"/><circle cx="13.4" cy="15" r=".9" class="ojo-brillo"/>',
    logs: '<path class="k" d="M12 3l7 3v5.5c0 4.6-3 7.9-7 9.5-4-1.6-7-4.9-7-9.5V6z"/><path class="k2 sin-borde" d="M12 3v18c-4-1.6-7-4.9-7-9.5V6z"/><path class="trazo-tinta" d="M8.9 11.2q1-1 2 0M13.1 11.2q1-1 2 0M10.8 14q1.2 1 2.4 0"/>',
    grupos: '<path class="k" d="M7.2 8.5h9.6a4 4 0 0 1 3.9 4.9l-.8 3.6a1.9 1.9 0 0 1-3.3.8l-1.9-2.3H9.3l-1.9 2.3a1.9 1.9 0 0 1-3.3-.8l-.8-3.6a4 4 0 0 1 3.9-4.9z"/><circle cx="10" cy="12.3" r="1" class="tinta"/><circle cx="14" cy="12.3" r="1" class="tinta"/><path class="trazo-tinta" d="M11.1 14q.9.8 1.8 0"/><circle cx="17.3" cy="11.4" r=".9" class="acento"/>',
    niveles: '<rect class="k" x="4.5" y="13" width="4" height="7" rx="1.2"/><rect class="k" x="10" y="9.5" width="4" height="10.5" rx="1.2"/><rect class="k2" x="15.5" y="5" width="4" height="15" rx="1.2"/><circle cx="16.8" cy="9.3" r=".8" class="tinta"/><circle cx="18.2" cy="9.3" r=".8" class="tinta"/><path class="k" d="M17.5 1.8l.5 1.2 1.2.5-1.2.5-.5 1.2-.5-1.2-1.2-.5 1.2-.5z"/>',
    novedades: '<path class="k" d="M6.5 4.5h11a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H7A2.5 2.5 0 0 1 4.5 17.5v-11a2 2 0 0 1 2-2z"/><circle cx="9.8" cy="10.6" r="1" class="tinta"/><circle cx="14.2" cy="10.6" r="1" class="tinta"/><path class="trazo-tinta" d="M10.7 12.8q1.3 1.3 2.6 0"/><path class="trazo-acento" d="M8 16.6h8"/>',
    ia: '<circle class="k2" cx="12" cy="11" r="7"/><path class="k" d="M7.5 20.5h9l-1.5-3h-6z"/><circle cx="9.7" cy="10.5" r="1.1" class="ojo-blanco"/><circle cx="14.3" cy="10.5" r="1.1" class="ojo-blanco"/><path class="trazo-blanco" d="M8.6 7.5a4.5 4.5 0 0 1 2.4-2"/>',
  };
  const LINEA = {
    canal: '<path d="M9.5 4 7.5 20M16.5 4l-2 16M4.5 9h16M3.5 15h16"/>',
    rol: '<path d="M12 2.8 14.6 8l5.6.8-4.1 4 1 5.6L12 15.7l-5.1 2.7 1-5.6-4.1-4L9.4 8z"/>',
    color: '<path d="M12 3c3.2 4.1 6 7.6 6 11a6 6 0 0 1-12 0c0-3.4 2.8-6.9 6-11z"/><path d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
    guardar: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    descartar: '<path d="M9 14.5 4 9.5l5-5M4 9.5h10.5a5 5 0 0 1 0 10H12"/>',
    salir: '<path d="M14.5 4H18a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3.5M10 16l4-4-4-4M14 12H4"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h11"/>',
  };

  function svg(nombre, clase = '') {
    if (KAWAII[nombre]) return `<svg class="icono icono-kawaii ${clase}" viewBox="0 0 24 24" aria-hidden="true">${KAWAII[nombre]}</svg>`;
    return `<svg class="icono icono-linea ${clase}" viewBox="0 0 24 24" aria-hidden="true">${LINEA[nombre] || ''}</svg>`;
  }

  return { svg };
})();
