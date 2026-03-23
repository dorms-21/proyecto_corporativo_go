let usuarioPage = 1;
const usuarioLimit = 5;

function toggleUsuarioForm(show = false) {
  qs("#formUsuario")?.classList.toggle("hidden", !show);
}

function resetUsuarioForm() {
  qs("#formUsuario")?.reset();
  if (qs("#usuarioId")) qs("#usuarioId").value = "";
  hideElement("#previewImagenUsuario");
  qs("#previewImagenUsuario").src = "";
  clearTextErrors();
}

function validateUsuarioForm() {
  clearTextErrors();
  let valid = true;

  const nombre = qs("#strNombreUsuario").value.trim();
  const perfil = qs("#idPerfilUsuario").value;
  const pwd = qs("#strPwd").value.trim();
  const estado = qs("#idEstadoUsuario").value;
  const correo = qs("#strCorreo").value.trim();
  const celular = qs("#strNumeroCelular").value.trim();

  if (!nombre) {
    showTextError("errorNombreUsuario", "El nombre de usuario es obligatorio");
    valid = false;
  }

  if (!perfil) {
    showTextError("errorPerfilUsuario", "Selecciona un perfil");
    valid = false;
  }

  if (!pwd) {
    showTextError("errorPwdUsuario", "La contraseña es obligatoria");
    valid = false;
  }

  if (!estado) {
    showTextError("errorEstadoUsuario", "Selecciona un estado");
    valid = false;
  }

  if (!correo || !/\S+@\S+\.\S+/.test(correo)) {
    showTextError("errorCorreoUsuario", "Correo inválido");
    valid = false;
  }

  if (!/^\d{10,15}$/.test(celular)) {
    showTextError("errorCelularUsuario", "Celular inválido");
    valid = false;
  }

  return valid;
}

async function loadPerfilesSelect() {
  try {
    const data = await apiFetch("/perfiles?limit=100&offset=0", { method: "GET" });
    const select = qs("#idPerfilUsuario");
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

function renderUsuarios(rows = []) {
  const tbody = qs("#tablaUsuarios");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => {
    const estadoTexto = row.estadoNombre || row.str_nombre || row.estado || row.idEstadoUsuario;
    const perfilTexto = row.perfilNombre || row.str_nombre_perfil || row.idPerfil;
    const image = formatImageUrl(row.strImagenUsuario || row.str_imagen_usuario);

    return `
      <tr>
        <td>${row.id}</td>
        <td><img src="${image}" class="table-avatar" alt="usuario"></td>
        <td>${escapeHtml(row.strNombreUsuario || row.str_nombre_usuario || "")}</td>
        <td>${escapeHtml(perfilTexto || "")}</td>
        <td>${toStatusBadge(estadoTexto || "")}</td>
        <td>${escapeHtml(row.strCorreo || row.str_correo || "")}</td>
        <td>${escapeHtml(row.strNumeroCelular || row.str_numero_celular || "")}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn-info btn-table" onclick='editUsuario(${JSON.stringify(row)})'>Editar</button>
            <button class="btn btn-danger btn-table" onclick="deleteUsuario(${row.id})">Eliminar</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

async function loadUsuarios(page = 1) {
  usuarioPage = page;
  try {
    const offset = (page - 1) * usuarioLimit;
    const data = await apiFetch(`/usuarios?limit=${usuarioLimit}&offset=${offset}`, { method: "GET" });

    renderUsuarios(data.rows || []);
    buildPagination("paginacionUsuarios", page, data.totalPages || 1, "loadUsuarios");
  } catch (error) {
    console.error(error);
  }
}

function previewUsuarioImage() {
  const input = qs("#imagenUsuario");
  const preview = qs("#previewImagenUsuario");
  if (!input || !preview || !input.files || !input.files[0]) return;

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = e => {
    preview.src = e.target.result;
    showElement(preview);
  };

  reader.readAsDataURL(file);
}

function editUsuario(row) {
  toggleUsuarioForm(true);
  qs("#usuarioId").value = row.id || "";
  qs("#strNombreUsuario").value = row.strNombreUsuario || row.str_nombre_usuario || "";
  qs("#idPerfilUsuario").value = row.idPerfil || row.id_perfil || "";
  qs("#strPwd").value = "";
  qs("#idEstadoUsuario").value = row.idEstadoUsuario || row.id_estado_usuario || "";
  qs("#strCorreo").value = row.strCorreo || row.str_correo || "";
  qs("#strNumeroCelular").value = row.strNumeroCelular || row.str_numero_celular || "";

  const image = row.strImagenUsuario || row.str_imagen_usuario;
  if (image) {
    qs("#previewImagenUsuario").src = formatImageUrl(image);
    showElement("#previewImagenUsuario");
  } else {
    hideElement("#previewImagenUsuario");
  }
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

async function submitUsuario(event) {
  event.preventDefault();
  if (!validateUsuarioForm()) return;

  const id = qs("#usuarioId").value;
  const formData = new FormData();

  formData.append("strNombreUsuario", qs("#strNombreUsuario").value.trim());
  formData.append("idPerfil", qs("#idPerfilUsuario").value);
  formData.append("strPwd", qs("#strPwd").value.trim());
  formData.append("idEstadoUsuario", qs("#idEstadoUsuario").value);
  formData.append("strCorreo", qs("#strCorreo").value.trim());
  formData.append("strNumeroCelular", qs("#strNumeroCelular").value.trim());

  const fileInput = qs("#imagenUsuario");
  if (fileInput && fileInput.files && fileInput.files[0]) {
    formData.append("imagenUsuario", fileInput.files[0]);
  }

  try {
    if (id) {
      await apiFetch(`/usuarios/${id}`, {
        method: "PUT",
        body: formData
      });
    } else {
      await apiFetch("/usuarios", {
        method: "POST",
        body: formData
      });
    }

    resetUsuarioForm();
    toggleUsuarioForm(false);
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
  await loadPerfilesSelect();
  await loadUsuarios();

  qs("#btnNuevoUsuario")?.addEventListener("click", () => {
    resetUsuarioForm();
    toggleUsuarioForm(true);
  });

  qs("#btnCancelarUsuario")?.addEventListener("click", () => {
    resetUsuarioForm();
    toggleUsuarioForm(false);
  });

  qs("#imagenUsuario")?.addEventListener("change", previewUsuarioImage);
  qs("#formUsuario")?.addEventListener("submit", submitUsuario);
});