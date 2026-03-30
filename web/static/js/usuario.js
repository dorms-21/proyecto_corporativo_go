let usuarioPage = 1;
const usuarioLimit = 5;

function getUsuarioPerms() {
  const permissions = getPermissions();
  return permissions.usuario || {
    agregar: false,
    editar: false,
    consulta: false,
    eliminar: false,
    detalle: false
  };
}

const perms = getUsuarioPerms();

if (!perms.consulta) {
  window.location.href = "/dashboard";
}

function applyUsuarioPermissions() {
  const perms = getUsuarioPerms();

  if (!perms.agregar) hideElement("#btnNuevoUsuario");
  if (!perms.consulta) hideElement("#btnBuscarUsuario");
}

function renderUsuarios(rows = []) {
  const tbody = qs("#tablaUsuarios");
  if (!tbody) return;

  const perms = getUsuarioPerms();

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => {
    const estadoTexto = row.estadoNombre || row.str_nombre || row.estado || row.idEstadoUsuario;
    const perfilTexto = row.perfilNombre || row.str_nombre_perfil || row.idPerfil;
    const image = formatImageUrl(row.strImagenUsuario || row.str_imagen_usuario);

    let acciones = "";

    if (perms.editar) {
      acciones += `<button class="btn btn-info btn-table" onclick="goEditUsuario(${row.id})">Editar</button>`;
    }

    if (perms.eliminar) {
      acciones += `<button class="btn btn-danger btn-table" onclick="deleteUsuario(${row.id})">Eliminar</button>`;
    }

    if (!acciones) {
      acciones = `<span class="badge badge-info">Sin acciones</span>`;
    }

    return `
      <tr>
        <td><img src="${image}" class="table-avatar" alt="usuario"></td>
        <td>${escapeHtml(row.strNombreUsuario || row.str_nombre_usuario || "")}</td>
        <td>${escapeHtml(perfilTexto || "")}</td>
        <td>${toStatusBadge(estadoTexto || "")}</td>
        <td>${escapeHtml(row.strCorreo || row.str_correo || "")}</td>
        <td>${escapeHtml(row.strNumeroCelular || row.str_numero_celular || "")}</td>
        <td>
          <div class="table-actions">
            ${acciones}
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadUsuarios(page = 1) {
  usuarioPage = page;

  const perms = getUsuarioPerms();
  if (!perms.consulta) return;

  try {
    const offset = (page - 1) * usuarioLimit;
    const data = await apiFetch(`/usuarios?limit=${usuarioLimit}&offset=${offset}`, { method: "GET" });

    renderUsuarios(data.rows || []);
    buildPagination("paginacionUsuarios", page, data.totalPages || 1, "loadUsuarios");
  } catch (error) {
    console.error(error);
  }
}

function goEditUsuario(id) {
  window.location.href = `/seguridad/usuario/editar/${id}`;
}

async function deleteUsuario(id) {
  if (!confirm("¿Deseas eliminar este usuario?")) return;

  try {
    await apiFetch(`/usuarios/${id}`, { method: "DELETE" });
    await loadUsuarios(usuarioPage);
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
  applyUsuarioPermissions();
  loadUsuarios();

  qs("#btnNuevoUsuario")?.addEventListener("click", () => {
    window.location.href = "/seguridad/usuario/nuevo";
  });
});