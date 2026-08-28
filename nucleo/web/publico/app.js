const selectPerfil = document.getElementById('select-perfil');
const btnNuevoPerfil = document.getElementById('btn-nuevo-perfil');
const formNuevoPerfil = document.getElementById('form-nuevo-perfil');
const btnCrearPerfil = document.getElementById('btn-crear-perfil');
const listaDisponibles = document.getElementById('lista-disponibles');
const listaPendientes = document.getElementById('lista-pendientes');
const modalFondo = document.getElementById('modal-fondo');
const modalTitulo = document.getElementById('modal-titulo');
const modalGuia = document.getElementById('modal-guia');
const modalForm = document.getElementById('modal-form');
const modalResultado = document.getElementById('modal-resultado');
const btnCerrarModal = document.getElementById('btn-cerrar-modal');

let herramientas = [];
let integracionesDelPerfil = [];

async function cargarPerfiles() {
  const perfiles = await fetch('/api/perfiles').then((r) => r.json());
  selectPerfil.innerHTML = perfiles
    .map((p) => `<option value="${p.id}">${p.nombreDisplay ?? p.id} (${p.profesion})</option>`)
    .join('');
  if (perfiles.length === 0) {
    formNuevoPerfil.classList.remove('oculto');
  }
}

async function cargarIntegraciones() {
  const perfilId = selectPerfil.value;
  integracionesDelPerfil = perfilId
    ? await fetch(`/api/perfiles/${perfilId}/integraciones`).then((r) => r.json())
    : [];
}

function estadoDeHerramienta(id) {
  return integracionesDelPerfil.find((i) => i.herramienta === id && i.estado === 'activa');
}

function renderizarTarjeta(h) {
  const integracion = estadoDeHerramienta(h.id);
  let badge = '';
  if (integracion) {
    if (integracion.verificacion?.ok) badge = '<div class="estado-badge ok">Conectada y verificada</div>';
    else if (integracion.verificacion) badge = '<div class="estado-badge error">Conectada, sin verificar bien</div>';
    else badge = '<div class="estado-badge">Conectada (sin verificar todavía)</div>';
  }

  const chips = h.capacidadesQueOfrece.map((c) => `<span class="chip">${c}</span>`).join('');
  const disponible = h.estado === 'disponible';

  return `
    <div class="tarjeta">
      <h3>${h.nombre}</h3>
      <p>${h.descripcion}</p>
      <div class="capacidades">${chips}</div>
      ${badge}
      ${disponible ? `<button data-id="${h.id}" class="btn-conectar">${integracion ? 'Reconectar' : 'Conectar'}</button>` : `<span class="estado-badge">${h.estado.replace('_', ' ')}</span>`}
    </div>
  `;
}

async function renderizarTodo() {
  await cargarIntegraciones();
  const disponibles = herramientas.filter((h) => h.estado === 'disponible');
  const pendientes = herramientas.filter((h) => h.estado !== 'disponible');
  listaDisponibles.innerHTML = disponibles.map(renderizarTarjeta).join('');
  listaPendientes.innerHTML = pendientes.map(renderizarTarjeta).join('');
  document.querySelectorAll('.btn-conectar').forEach((btn) => {
    btn.addEventListener('click', () => abrirModal(btn.dataset.id));
  });
}

function abrirModal(herramientaId) {
  const h = herramientas.find((x) => x.id === herramientaId);
  modalTitulo.textContent = h.nombre;
  modalGuia.innerHTML = (h.guiaCredenciales ?? []).map((paso) => `<li>${paso}</li>`).join('');
  modalResultado.textContent = '';

  const camposHtml = h.camposCredenciales
    .map(
      (campo) => `
        <div>
          <label>${campo}</label>
          <input name="${campo}" type="text" required />
        </div>`,
    )
    .join('');

  const capacidadesHtml = h.capacidadesQueOfrece
    .map(
      (c) => `
        <div class="campo-capacidad">
          <input type="checkbox" name="cap-${c}" checked />
          <label style="margin:0">${c}</label>
        </div>`,
    )
    .join('');

  modalForm.innerHTML = `
    ${camposHtml}
    <p class="subtitulo" style="margin-top:0.5rem">Capacidades a habilitar (mínimo privilegio):</p>
    ${capacidadesHtml}
    <button type="submit">Conectar y verificar</button>
  `;
  modalForm.dataset.herramientaId = herramientaId;
  modalFondo.classList.remove('oculto');
}

function cerrarModal() {
  modalFondo.classList.add('oculto');
}

modalForm.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  const herramientaId = modalForm.dataset.herramientaId;
  const datosFormulario = new FormData(modalForm);
  const h = herramientas.find((x) => x.id === herramientaId);

  const campos = {};
  for (const campo of h.camposCredenciales) campos[campo] = datosFormulario.get(campo);

  const capacidadesHabilitadas = h.capacidadesQueOfrece.filter((c) => datosFormulario.get(`cap-${c}`));

  modalResultado.textContent = 'Conectando y verificando...';

  const perfilId = selectPerfil.value;
  const profesionNueva = selectPerfil.selectedOptions[0]?.dataset.profesionNueva;
  const respuesta = await fetch('/api/conectar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Interfaz-Token': window.__TOKEN_INTERFAZ__ },
    body: JSON.stringify({ perfilId, profesionNueva, herramientaId, campos, capacidadesHabilitadas }),
  }).then((r) => r.json());

  if (respuesta.error) {
    modalResultado.textContent = `Error: ${respuesta.error}`;
  } else if (respuesta.verificacion.ok) {
    modalResultado.textContent = 'Conectada y verificada -- funciona de verdad.';
  } else {
    modalResultado.textContent = `Se guardó, pero la verificación falló:\n${respuesta.verificacion.error}`;
  }

  await renderizarTodo();
});

btnCerrarModal.addEventListener('click', cerrarModal);
modalFondo.addEventListener('click', (e) => { if (e.target === modalFondo) cerrarModal(); });

btnNuevoPerfil.addEventListener('click', () => formNuevoPerfil.classList.toggle('oculto'));

btnCrearPerfil.addEventListener('click', async () => {
  const id = document.getElementById('input-nuevo-id').value.trim();
  const profesion = document.getElementById('input-nueva-profesion').value.trim();
  if (!id || !profesion) return;
  // Se crea "de paso" al conectar la primera herramienta -- aquí solo lo
  // dejamos seleccionado para que el flujo de conectar lo cree si no existe.
  const option = document.createElement('option');
  option.value = id;
  option.textContent = `${id} (${profesion}) -- nuevo`;
  option.dataset.profesionNueva = profesion;
  selectPerfil.appendChild(option);
  selectPerfil.value = id;
  formNuevoPerfil.classList.add('oculto');
  await renderizarTodo();
});

selectPerfil.addEventListener('change', renderizarTodo);

(async function iniciar() {
  herramientas = await fetch('/api/herramientas').then((r) => r.json());
  await cargarPerfiles();
  await renderizarTodo();
})();
