let moduloPage = 1;
const moduloLimit = 5;

function getModuloPerms() {
  const permissions = getPermissions();
  return permissions.modulo || {
    agregar: false,
    editar: false,
    consulta: false,
    eliminar: false,
    detalle: false
  };
}

function applyModuloPermissions() {
  const perms = getModuloPerms();

  if (!perms.agregar) hideElement("#btnNuevoModulo");
  if (!perms.consulta) hideElement("#btnBuscarModulo");
}

function renderModulos(rows = []) {
  const tbody = qs("#tablaModulos");
  if (!tbody) return;

  const perms = getModuloPerms();

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => {
    let acciones = "";

    if (perms.editar) {
      acciones += `<button class="btn btn-info btn-table" onclick="goEditModulo(${row.id})">Editar</button>`;
    }

    if (perms.eliminar) {
      acciones += `<button class="btn btn-danger btn-table" onclick="deleteModulo(${row.id})">Eliminar</button>`;
    }

    if (!acciones) {
      acciones = `<span class="badge badge-info">Sin acciones</span>`;
    }

    return `
      <tr>
        <td>${escapeHtml(row.strNombreModulo || row.str_nombre_modulo || "")}</td>
        <td>${escapeHtml(row.strClaveModulo || row.str_clave_modulo || "")}</td>
        <td>${escapeHtml(row.strRuta || row.str_ruta || "")}</td>
        <td>${toBooleanBadge(row.bitEstatico ?? row.bit_estatico)}</td>
        <td>
          <div class="table-actions">
            ${acciones}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadModulos(page = 1) {
  moduloPage = page;

  const perms = getModuloPerms();
  if (!perms.consulta) return;

  try {
    const offset = (page - 1) * moduloLimit;
    const data = await apiFetch(`/modulos?limit=${moduloLimit}&offset=${offset}`, { method: "GET" });

    renderModulos(data.rows || []);
    buildPagination("paginacionModulos", page, data.totalPages || 1, "loadModulos");
  } catch (error) {
    console.error(error);
  }
}

function goEditModulo(id) {
  window.location.href = `/seguridad/modulo/editar/${id}`;
}

async function deleteModulo(id) {
  if (!confirm("¿Deseas eliminar este módulo?")) return;

  try {
    await apiFetch(`/modulos/${id}`, { method: "DELETE" });
    await loadModulos(moduloPage);
  } catch (error) {
    alert(error.message);
  }
}

async function refreshModules() {
  try {
    const res = await apiFetch("/modulos/refresh-links", {
      method: "POST"
    });

    const me = await apiFetch("/auth/me", { method: "GET" });
    if (me.user) saveUser(me.user);
    if (me.menus) saveMenus(me.menus);
    if (me.permissions) savePermissions(me.permissions);

    alert(`${res.message}. Nuevos enlaces agregados: ${res.inserted}`);
    window.location.href = "/dashboard";
  } catch (error) {
    alert(error.message || "No se pudieron refrescar los módulos");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();
  applyModuloPermissions();
  loadModulos();

  qs("#btnNuevoModulo")?.addEventListener("click", () => {
    window.location.href = "/seguridad/modulo/nuevo";
  });

  qs("#btnRefrescarModulos")?.addEventListener("click", refreshModules);
});