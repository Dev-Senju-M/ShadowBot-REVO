// Shadow, la mascota chibi del panel, y la decoración de cada temporada.
// Todo el SVG es nuestro y sin texto de usuarios, así que se inserta con innerHTML.
const Mascota = (() => {
  const OJOS = { normal: '#b98cff', halloween: '#ffb347', navidad: '#9fe0ff' };
  let contador = 0;

  const cuerpo = (id) => `
    <path d="M44 44 36 22 56 36z" fill="url(#${id}-g)" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M96 44l8-22-20 14z" fill="url(#${id}-g)" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M70 30c30 0 44 22 44 46 0 26-20 40-44 40S26 102 26 76c0-24 14-46 44-46z" fill="url(#${id}-g)" stroke="#0d0416" stroke-width="4"/>
    <path d="M40 60c3-12 12-20 24-22" stroke="#8b3dff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".8"/>`;

  const bufanda = `
    <g fill="#fff" stroke="#0d0416" stroke-width="3"><circle cx="34" cy="106" r="11"/><circle cx="52" cy="113" r="12"/><circle cx="70" cy="115" r="12"/><circle cx="88" cy="113" r="12"/><circle cx="106" cy="106" r="11"/></g>
    <path d="M30 104q4-4 8 0M64 112q5-4 10 0M100 104q4-4 8 0" stroke="#b98cff" stroke-width="2" fill="none" stroke-linecap="round"/>`;

  function cara(estado, tema, id) {
    const ojo = OJOS[tema] || OJOS.normal;
    const rubor = tema === 'navidad' ? '<ellipse cx="46" cy="84" rx="6" ry="3.5" fill="#ff7aa8" opacity=".8"/><ellipse cx="94" cy="84" rx="6" ry="3.5" fill="#ff7aa8" opacity=".8"/>' : '';
    if (estado === 'feliz') {
      return `<g filter="url(#${id}-b)"><path d="M47 74q9-12 18 0M75 74q9-12 18 0" stroke="${ojo}" stroke-width="5" fill="none" stroke-linecap="round"/></g>
        <path d="M56 84h28c0 12-6 18-14 18s-14-6-14-18z" fill="#2a0a3a" stroke="#0d0416" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="M62 96c3-4 13-4 16 0-2 4-14 4-16 0z" fill="#ff7aa8"/>${rubor}`;
    }
    if (estado === 'triste') {
      return `<g filter="url(#${id}-b)"><ellipse cx="56" cy="74" rx="7" ry="8" fill="${ojo}" opacity=".85"/><ellipse cx="84" cy="74" rx="7" ry="8" fill="${ojo}" opacity=".85"/></g>
        <path d="M47 62q8 2 14-2M93 62q-8 2-14-2" stroke="${ojo}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
        <path d="M63 92q7-5 14 0" stroke="${ojo}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path class="mascota-lagrima" d="M88 82q3 5 0 8-3-3 0-8z" fill="#9fd8f0" stroke="#0d0416" stroke-width="1.2"/>${rubor}`;
    }
    const colmillo = tema === 'halloween' ? '<path d="M66 90l3 4 3-3z" fill="#fff" stroke="#0d0416" stroke-width="1"/>' : '';
    return `<g class="mascota-ojos"><g filter="url(#${id}-b)"><ellipse cx="56" cy="72" rx="8" ry="10" fill="${ojo}"/><ellipse cx="84" cy="72" rx="8" ry="10" fill="${ojo}"/></g>
        <circle cx="58" cy="69" r="3" fill="#fff"/><circle cx="86" cy="69" r="3" fill="#fff"/></g>
      <path d="M62 88q8 6 16 0" stroke="${ojo}" stroke-width="3" fill="none" stroke-linecap="round"/>${colmillo}${rubor}`;
  }

  function accesorio(tema) {
    if (tema === 'halloween') {
      return `<ellipse cx="70" cy="36" rx="38" ry="8" fill="#1a0833" stroke="#0d0416" stroke-width="3.5"/>
        <path d="M48 35 72 -6q7-4 9 4l11 37z" fill="#2b0f4f" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M50 29h40l2 6H48z" fill="#ff8a1f" stroke="#0d0416" stroke-width="2.5"/>
        <path d="M78 3l2 4 4 1-4 1-2 4-2-4-4-1 4-1z" fill="#ffd98a"/>`;
    }
    if (tema === 'navidad') {
      return `<path d="M40 42q14-36 52-28 12 4 10 22z" fill="#e23b4a" stroke="#0d0416" stroke-width="3.5" stroke-linejoin="round"/>
        <path d="M36 40q34-12 70-4" stroke="#0d0416" stroke-width="13" fill="none" stroke-linecap="round"/>
        <path d="M36 40q34-12 70-4" stroke="#fff" stroke-width="9" fill="none" stroke-linecap="round"/>
        <circle cx="104" cy="34" r="8" fill="#fff" stroke="#0d0416" stroke-width="3"/>`;
    }
    return '';
  }

  const CALABAZA = `<g transform="translate(98 94) scale(1.4)">
    <ellipse cx="12" cy="13" rx="11" ry="9" fill="#ff8a1f" stroke="#0d0416" stroke-width="2.2"/>
    <path d="M12 4.5v17M6 5.5c-2 5-2 10 0 15M18 5.5c2 5 2 10 0 15" stroke="#c45a00" stroke-width="1.4" fill="none"/>
    <path d="M11 4.5l1-3.5 2 .5-1.5 3" fill="#3f8f3a" stroke="#0d0416" stroke-width="1.2"/>
    <path d="M6.5 11l2.5-2.5L11 11zM13 11l2-2.5 2.5 2.5zM7 15q5 4 10 0l-1.6.4-1.2 1.4-1.4-1.4-1.6 1.4-1.4-1.4z" fill="#ffe27a"/></g>`;
  const RAYOS = `<path class="mascota-rayo" d="M2 30l13 4-6 6 12 7-17-4 6-6z" fill="#8b3dff" stroke="#0d0416" stroke-width="1.5"/>
    <path class="mascota-rayo mascota-rayo-2" d="M138 44l-13 4 6 6-12 7 17-4-6-6z" fill="#8b3dff" stroke="#0d0416" stroke-width="1.5"/>`;

  function svg(estado = 'hola', tema = 'normal') {
    const id = `m${++contador}`;
    return `<svg class="mascota-svg" viewBox="-10 -14 160 160" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="${id}-g" cx=".45" cy=".35" r=".75"><stop offset="0" stop-color="#3a1670"/><stop offset=".65" stop-color="#1a0833"/><stop offset="1" stop-color="#0b0216"/></radialGradient>
        <filter id="${id}-b" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      ${estado === 'feliz' ? RAYOS : ''}
      <g class="mascota-cuerpo">${cuerpo(id)}${cara(estado, tema, id)}${bufanda}${accesorio(tema)}</g>
      ${tema === 'halloween' && estado !== 'triste' ? CALABAZA : ''}
    </svg>`;
  }

  // Dibuja la mascota en cada elemento .mascota (usa su data-estado)
  function pintar(raiz = document, tema = document.documentElement.dataset.tema || 'normal') {
    raiz.querySelectorAll('.mascota').forEach(el => { el.innerHTML = svg(el.dataset.estado || 'hola', tema); });
  }

  const MURCIELAGO = '<svg viewBox="0 0 24 10"><path d="M0 6q4-6 8-2 2-4 4 0 2-4 4 0 4-4 8 2-6-1-8 3-2-3-4 0-2-3-4 0-2-4-8-3z" fill="#0d0416"/></svg>';
  const COPO = '<svg viewBox="0 0 12 12"><path d="M6 0v12M0 6h12M1.8 1.8l8.4 8.4M10.2 1.8l-8.4 8.4" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>';
  const NUBE = '<svg viewBox="0 0 44 34"><path d="M10 30c-6 0-9-6-5-10-2-6 5-10 10-7 2-6 11-7 14-1 6-2 11 3 9 9 5 2 4 9-1 9z" fill="#fff" stroke="#0d0416" stroke-width="2.4" stroke-linejoin="round"/><path d="M15 22q3-4 7-1M27 19q2-3 5 0" stroke="#b98cff" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';
  const RAYO = '<svg viewBox="0 0 14 12"><path d="M0 0l9 3-4 4 8 5-12-3 4-4z" fill="#8b3dff"/></svg>';

  // Llena la capa de decoración de fondo según el tema
  function decorar(el, tema) {
    if (!el) return;
    const lista = (n, clase, figura) => Array.from({ length: n }, (_, i) => `<span class="deco ${clase} deco-${i + 1}">${figura}</span>`);
    const piezas = {
      halloween: lista(4, 'deco-murcielago', MURCIELAGO),
      navidad: lista(10, 'deco-copo', COPO),
      normal: [...lista(2, 'deco-nube', NUBE), ...lista(1, 'deco-rayo', RAYO)],
    };
    el.innerHTML = (piezas[tema] || piezas.normal).join('');
  }

  return { svg, pintar, decorar };
})();
