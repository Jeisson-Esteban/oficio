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

const SVG_LAPIZ = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
  <path d="M4 20h4l10.5-10.5a2 2 0 0 0 0-2.83l-1.17-1.17a2 2 0 0 0-2.83 0L4 16v4z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

function renderizarTarjeta(h) {
  const integracion = estadoDeHerramienta(h.id);
  const disponible = h.estado === 'disponible';

  // Un punto de color es más rápido de escanear que leer texto (como en n8n),
  // pero el texto se mantiene siempre debajo -- el color nunca es la única señal.
  let claseEstado = 'sin-conectar';
  let textoEstado = 'Sin conectar';
  if (integracion) {
    if (integracion.verificacion?.ok) {
      claseEstado = 'ok';
      textoEstado = 'Conectada y verificada';
    } else if (integracion.verificacion) {
      claseEstado = 'error';
      textoEstado = 'Conectada, sin verificar bien';
    } else {
      claseEstado = 'pendiente';
      textoEstado = 'Conectada (sin verificar todavía)';
    }
  }

  const chips = h.capacidadesQueOfrece.map((c) => `<span class="chip">${c}</span>`).join('');

  return `
    <div class="tarjeta">
      <div class="tarjeta-header">
        ${disponible ? `<span class="punto-estado ${claseEstado}" title="${textoEstado}"></span>` : ''}
        <h3>${h.nombre}</h3>
        ${disponible ? `<button data-id="${h.id}" class="btn-editar" type="button" aria-label="${integracion ? 'Editar conexión' : 'Conectar'} de ${h.nombre}" title="${integracion ? 'Editar conexión' : 'Conectar'}">${SVG_LAPIZ}</button>` : ''}
      </div>
      <p>${h.descripcion}</p>
      <div class="capacidades">${chips}</div>
      ${disponible ? `<div class="estado-badge ${claseEstado}">${textoEstado}</div>` : `<span class="estado-badge">${h.estado.replace('_', ' ')}</span>`}
    </div>
  `;
}

async function renderizarTodo() {
  await cargarIntegraciones();
  const disponibles = herramientas.filter((h) => h.estado === 'disponible');
  const pendientes = herramientas.filter((h) => h.estado !== 'disponible');
  listaDisponibles.innerHTML = disponibles.map(renderizarTarjeta).join('');
  listaPendientes.innerHTML = pendientes.map(renderizarTarjeta).join('');
  document.querySelectorAll('.btn-editar').forEach((btn) => {
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
