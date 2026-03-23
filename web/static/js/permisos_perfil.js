let permisoPage = 1;
const permisoLimit = 5;

function resetPermisoForm() {
  qs("#formPermisosPerfil")?.reset();
  if (qs("#permisoPerfilId")) qs("#permisoPerfilId").value = "";
  clearTextErrors();
}

function validatePermisoForm() {
  clearTextErrors();
  let valid = true;

  if (!qs("#idPerfilPermiso").value) {
    showTextError("errorPerfilPermiso", "Selecciona un perfil");
    valid = false;
  }

  if (!qs("#idModuloPermiso").value) {
    showTextError("errorModuloPermiso", "Selecciona un módulo");
    valid = false;
  }

  return valid;
}

async function loadPerfilesPermiso() {
  try {
    const data = await apiFetch("/perfiles?limit=100&offset=0", { method: "GET" });
    const select = qs("#idPerfilPermiso");
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione</option>';
    (data.rows || []).forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.strNombrePerfil || row.str_nombre_perfil;
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}

async function loadModulosPermiso() {
  try {
    const data = await apiFetch("/modulos?limit=100&offset=0", { method: "GET" });
    const select = qs("#idModuloPermiso");
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione</option>';
    (data.rows || []).forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.strNombreModulo || row.str_nombre_modulo;
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}

function renderPermisos(rows = []) {
  const tbody = qs("#tablaPermisosPerfil");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.perfilNombre || row.str_nombre_perfil || "")}</td>
      <td>${escapeHtml(row.moduloNombre || row.str_nombre_modulo || "")}</td>
      <td>${toBooleanBadge(row.bitAgregar ?? row.bit_agregar)}</td>
      <td>${toBooleanBadge(row.bitEditar ?? row.bit_editar)}</td>
      <td>${toBooleanBadge(row.bitConsulta ?? row.bit_consulta)}</td>
      <td>${toBooleanBadge(row.bitEliminar ?? row.bit_eliminar)}</td>
      <td>${toBooleanBadge(row.bitDetalle ?? row.bit_detalle)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-info btn-table" onclick='editPermiso(${JSON.stringify(row)})'>Editar</button>
          <button class="btn btn-danger btn-table" onclick="deletePermiso(${row.id})">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadPermisos(page = 1) {
  permisoPage = page;
  try {
    const offset = (page - 1) * permisoLimit;
    const data = await apiFetch(`/permisos-perfil?limit=${permisoLimit}&offset=${offset}`, { method: "GET" });

    renderPermisos(data.rows || []);
    buildPagination("paginacionPermisos", page, data.totalPages || 1, "loadPermisos");
  } catch (error) {
    console.error(error);
  }
}

function editPermiso(row) {
  qs("#permisoPerfilId").value = row.id || "";
  qs("#idPerfilPermiso").value = row.idPerfil || row.id_perfil || "";
  qs("#idModuloPermiso").value = row.idModulo || row.id_modulo || "";
  qs("#bitAgregar").checked = !!(row.bitAgregar ?? row.bit_agregar);
  qs("#bitEditar").checked = !!(row.bitEditar ?? row.bit_editar);
  qs("#bitConsulta").checked = !!(row.bitConsulta ?? row.bit_consulta);
  qs("#bitEliminar").checked = !!(row.bitEliminar ?? row.bit_eliminar);
  qs("#bitDetalle").checked = !!(row.bitDetalle ?? row.bit_detalle);
}

async function deletePermiso(id) {
  if (!confirm("¿Deseas eliminar este permiso?")) return;

  try {
    await apiFetch(`/permisos-perfil/${id}`, { method: "DELETE" });
    await loadPermisos(permisoPage);
  } catch (error) {
    alert(error.message);
  }
}

async function submitPermiso(event) {
  event.preventDefault();
  if (!validatePermisoForm()) return;

  const id = qs("#permisoPerfilId").value;
  const payload = {
    idPerfil: qs("#idPerfilPermiso").value,
    idModulo: qs("#idModuloPermiso").value,
    bitAgregar: qs("#bitAgregar").checked,
    bitEditar: qs("#bitEditar").checked,
    bitConsulta: qs("#bitConsulta").checked,
    bitEliminar: qs("#bitEliminar").checked,
    bitDetalle: qs("#bitDetalle").checked
  };

  try {
    if (id) {
      await apiFetch(`/permisos-perfil/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/permisos-perfil", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetPermisoForm();
    await loadPermisos(permisoPage);
  } catch (error) {
    alert(error.message);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();
  await loadPerfilesPermiso();
  await loadModulosPermiso();
  await loadPermisos();

  qs("#btnCancelarPermiso")?.addEventListener("click", resetPermisoForm);
  qs("#formPermisosPerfil")?.addEventListener("submit", submitPermiso);
});