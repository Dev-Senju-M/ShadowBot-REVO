// Diálogo de confirmación del panel (<dialog> nativo con la mascota).
// Uso: if (await Dialogo.confirmar({ titulo, texto, boton, peligro })) { ... }
const Dialogo = (() => {
  function confirmar({ titulo, texto, boton = 'Confirmar', peligro = false }) {
    return new Promise((resolve) => {
      const dialogo = document.createElement('dialog');
      dialogo.className = 'dialogo';
      dialogo.innerHTML = `<div class="mascota" data-estado="${peligro ? 'triste' : 'hola'}"></div>
        <h2 class="titulo dialogo-titulo"></h2>
        <p class="dialogo-texto"></p>
        <div class="dialogo-botones">
          <button type="button" class="boton boton-fantasma" value="no">Cancelar</button>
          <button type="button" class="boton${peligro ? ' boton-peligro' : ''}" value="si"></button>
        </div>`;
      dialogo.querySelector('.dialogo-titulo').textContent = titulo;
      dialogo.querySelector('.dialogo-texto').textContent = texto;
      dialogo.querySelector('button[value="si"]').textContent = boton;
      document.body.append(dialogo);
      Mascota.pintar(dialogo);

      const cerrar = (valor) => {
        dialogo.close();
        dialogo.remove();
        resolve(valor);
      };
      dialogo.addEventListener('click', (evento) => {
        const elegido = evento.target.closest('button');
        if (elegido) cerrar(elegido.value === 'si');
        else if (evento.target === dialogo) cerrar(false);
      });
      dialogo.addEventListener('cancel', (evento) => {
        evento.preventDefault();
        cerrar(false);
      });
      dialogo.showModal();
      dialogo.querySelector('button[value="no"]').focus();
    });
  }

  return { confirmar };
})();
