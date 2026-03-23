function getUsuarioIdFromUrl() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1];
}

async function loadPerfilesUsuarioEditar() {
  try {
    const data = await apiFetch("/perfiles?limit=100&offset=0", { method: "GET" });
    const select = qs("#idPerfilUsuario");
    if (!select) return;

    select.innerHTML = '<option value="">Seleccione</option>';

    (data.rows || []).forEach(row => {
      const option = document.createElement("option");
      option.value = row.id;
      option.textContent = row.strNombrePerfil || "";
      select.appendChild(option);
    });
  } catch (error) {
    console.error(error);
  }
}

function validateUsuarioEditarForm() {
  clearTextErrors();
  let valid = true;

  const nombre = qs("#strNombreUsuario")?.value.trim() || "";
  const perfil = qs("#idPerfilUsuario")?.value || "";
  const estado = qs("#idEstadoUsuario")?.value || "";
  const correo = qs("#strCorreo")?.value.trim() || "";
  const celular = qs("#strNumeroCelular")?.value.trim() || "";

  if (!nombre) {
    showTextError("errorNombreUsuario", "El nombre de usuario es obligatorio");
    valid = false;
  }

  if (!perfil) {
    showTextError("errorPerfilUsuario", "Selecciona un perfil");
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

function previewUsuarioEditarImage() {
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

async function loadUsuarioEditar() {
  const id = getUsuarioIdFromUrl();
  qs("#usuarioId").value = id;

  try {
    const data = await apiFetch(`/usuarios/${id}`, { method: "GET" });

    qs("#strNombreUsuario").value = data.strNombreUsuario || "";
    qs("#idPerfilUsuario").value = data.idPerfil || "";
    qs("#strPwd").value = "";
    qs("#idEstadoUsuario").value = data.idEstadoUsuario || "";
    qs("#strCorreo").value = data.strCorreo || "";
    qs("#strNumeroCelular").value = data.strNumeroCelular || "";

    if (data.strImagenUsuario) {
      qs("#previewImagenUsuario").src = formatImageUrl(data.strImagenUsuario);
      showElement("#previewImagenUsuario");
    } else {
      hideElement("#previewImagenUsuario");
    }
  } catch (error) {
    alert(error.message || "No se pudo cargar el usuario");
    window.location.href = "/seguridad/usuario";
  }
}

async function submitUsuarioEditar(event) {
  event.preventDefault();

  if (!validateUsuarioEditarForm()) return;

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
    await apiFetch(`/usuarios/${id}`, {
      method: "PUT",
      body: formData
    });

    alert("Usuario actualizado correctamente");
    window.location.href = "/seguridad/usuario";
  } catch (error) {
    alert(error.message || "No se pudo actualizar el usuario");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();

  await loadPerfilesUsuarioEditar();
  await loadUsuarioEditar();

  qs("#imagenUsuario")?.addEventListener("change", previewUsuarioEditarImage);
  qs("#formUsuarioEditar")?.addEventListener("submit", submitUsuarioEditar);
});