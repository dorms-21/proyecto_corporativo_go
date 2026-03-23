let perfilPage = 1;
const perfilLimit = 5;

function validatePerfilForm() {
  clearTextErrors();
  const nombre = qs("#strNombrePerfil")?.value.trim() || "";
  let valid = true;

  if (!nombre) {
    showTextError("errorNombrePerfil", "El nombre del perfil es obligatorio");
    valid = false;
  }

  return valid;
}

function renderPerfiles(rows = []) {
  const tbody = qs("#tablaPerfiles");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${escapeHtml(row.strNombrePerfil || row.str_nombre_perfil || "")}</td>
      <td>${toBooleanBadge(row.bitAdministrador ?? row.bit_administrador)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-info btn-table" onclick="goEditPerfil(${row.id})">Editar</button>
          <button class="btn btn-danger btn-table" onclick="deletePerfil(${row.id})">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadPerfiles(page = 1) {
  perfilPage = page;
  try {
    const offset = (page - 1) * perfilLimit;
    const data = await apiFetch(`/perfiles?limit=${perfilLimit}&offset=${offset}`, { method: "GET" });

    renderPerfiles(data.rows || []);
    buildPagination("paginacionPerfiles", page, data.totalPages || 1, "loadPerfiles");
  } catch (error) {
    console.error(error);
  }
}

function goEditPerfil(id) {
  window.location.href = `/seguridad/perfil/editar/${id}`;
}

async function deletePerfil(id) {
  if (!confirm("¿Deseas eliminar este perfil?")) return;

  try {
    await apiFetch(`/perfiles/${id}`, { method: "DELETE" });
    await loadPerfiles(perfilPage);
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
  loadPerfiles();

  qs("#btnNuevoPerfil")?.addEventListener("click", () => {
    window.location.href = "/seguridad/perfil/nuevo";
  });
});