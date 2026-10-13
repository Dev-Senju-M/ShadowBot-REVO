// Pantalla de inicio de sesión: tema de temporada, mascota y mensaje de error.
(async () => {
  const MENSAJES = {
    estado: 'El inicio de sesión expiró o no es válido. Inténtalo de nuevo.',
    acceso: 'Tu cuenta no tiene Administrador ni Gestionar servidor en el servidor del bot.',
    discord: 'Discord no respondió. Inténtalo en un momento.',
    cancelado: 'Cancelaste el inicio de sesión.',
    sesion: 'Tu sesión terminó. Vuelve a iniciar sesión.',
  };
  const codigo = new URLSearchParams(location.search).get('error');
  if (codigo && MENSAJES[codigo]) {
    const el = document.getElementById('login-error');
    el.textContent = MENSAJES[codigo];
    el.hidden = false;
    document.querySelector('.login .mascota').dataset.estado = 'triste';
  }
  const tema = await fetch('/api/tema').then(r => r.json()).then(d => d.temporada).catch(() => 'normal');
  document.documentElement.dataset.tema = tema;
  Mascota.pintar(document);
  Mascota.decorar(document.querySelector('.decoracion'), tema);
})();
