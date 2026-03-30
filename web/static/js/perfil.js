let perfilPage = 1;
const perfilLimit = 5;

function getPerfilPerms() {
  const permissions = getPermissions();
  return permissions.perfil || {
    agregar: false,
    editar: false,
    consulta: false,
    eliminar: false,
    detalle: false
  };
}

function applyPerfilPermissions() {
  const perms = getPerfilPerms();

  if (!perms.agregar) hideElement("#btnNuevoPerfil");
  if (!perms.consulta) hideElement("#btnBuscarPerfil");
}

function renderPerfiles(rows = []) {
  const tbody = qs("#tablaPerfiles");
  if (!tbody) return;

  const perms = getPerfilPerms();

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="3" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => {
    let acciones = "";

    if (perms.editar) {
      acciones += `<button class="btn btn-info btn-table" onclick="goEditPerfil(${row.id})">Editar</button>`;
    }

    if (perms.eliminar) {
      acciones += `<button class="btn btn-danger btn-table" onclick="deletePerfil(${row.id})">Eliminar</button>`;
    }

    if (!acciones) {
      acciones = `<span class="badge badge-info">Sin acciones</span>`;
    }

    return `
      <tr>
        <td>${escapeHtml(row.strNombrePerfil || row.str_nombre_perfil || "")}</td>
        <td>${toBooleanBadge(row.bitAdministrador ?? row.bit_administrador)}</td>
        <td>
          <div class="table-actions">
            ${acciones}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadPerfiles(page = 1) {
  perfilPage = page;

  const perms = getPerfilPerms();
  if (!perms.consulta) return;

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
  applyPerfilPermissions();
  loadPerfiles();

  qs("#btnNuevoPerfil")?.addEventListener("click", () => {
    window.location.href = "/seguridad/perfil/nuevo";
  });
});