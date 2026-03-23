let modulosCache = [];
let permisosCache = [];
let perfilActual = "";

async function loadPerfilesSelector() {
  const data = await apiFetch("/perfiles?limit=100&offset=0", { method: "GET" });
  const select = qs("#perfilSelector");
  select.innerHTML = '<option value="">Seleccione</option>';

  (data.rows || []).forEach(row => {
    const option = document.createElement("option");
    option.value = row.id;
    option.textContent = row.strNombrePerfil;
    select.appendChild(option);
  });
}

async function loadModulos() {
  const data = await apiFetch("/modulos?limit=100&offset=0", { method: "GET" });
  modulosCache = data.rows || [];
}

async function loadPermisosByPerfil(idPerfil) {
  const data = await apiFetch("/permisos-perfil?limit=200&offset=0", { method: "GET" });
  permisosCache = (data.rows || []).filter(p => Number(p.idPerfil) === Number(idPerfil));
}

function renderPermisosMatrix() {
  const tbody = qs("#tablaPermisosMatriz");

  if (!perfilActual) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Selecciona un perfil</td></tr>`;
    return;
  }

  if (!modulosCache.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No hay módulos</td></tr>`;
    return;
  }

  tbody.innerHTML = modulosCache.map(modulo => {
    const permiso = permisosCache.find(p => Number(p.idModulo) === Number(modulo.id)) || {};

    return `
      <tr data-modulo-id="${modulo.id}" data-permiso-id="${permiso.id || ""}">
        <td>${escapeHtml(modulo.strNombreModulo)}</td>
        <td><input type="checkbox" class="perm-agregar" ${permiso.bitAgregar ? "checked" : ""}></td>
        <td><input type="checkbox" class="perm-editar" ${permiso.bitEditar ? "checked" : ""}></td>
        <td><input type="checkbox" class="perm-eliminar" ${permiso.bitEliminar ? "checked" : ""}></td>
        <td><input type="checkbox" class="perm-consulta" ${permiso.bitConsulta ? "checked" : ""}></td>
        <td><input type="checkbox" class="perm-detalle" ${permiso.bitDetalle ? "checked" : ""}></td>
      </tr>
    `;
  }).join("");
}

async function buscarPermisosPerfil() {
  perfilActual = qs("#perfilSelector").value;

  if (!perfilActual) {
    alert("Selecciona un perfil");
    return;
  }

  await loadPermisosByPerfil(perfilActual);
  renderPermisosMatrix();
}

async function guardarPermisosMatriz() {
  if (!perfilActual) {
    alert("Selecciona un perfil");
    return;
  }

  const rows = qsa("#tablaPermisosMatriz tr[data-modulo-id]");

  for (const row of rows) {
    const idModulo = row.dataset.moduloId;
    const permisoId = row.dataset.permisoId;

    const payload = {
      idPerfil: Number(perfilActual),
      idModulo: Number(idModulo),
      bitAgregar: row.querySelector(".perm-agregar").checked,
      bitEditar: row.querySelector(".perm-editar").checked,
      bitEliminar: row.querySelector(".perm-eliminar").checked,
      bitConsulta: row.querySelector(".perm-consulta").checked,
      bitDetalle: row.querySelector(".perm-detalle").checked
    };

    if (permisoId) {
      await apiFetch(`/permisos-perfil/${permisoId}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/permisos-perfil", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }
  }

  alert("Permisos guardados correctamente");
  await buscarPermisosPerfil();
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();

  await loadPerfilesSelector();
  await loadModulos();

  qs("#btnBuscarPermisos")?.addEventListener("click", buscarPermisosPerfil);
  qs("#btnGuardarPermisosMatriz")?.addEventListener("click", guardarPermisosMatriz);
});