async function loadPerfilesUsuarioNuevo() {
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

function validateUsuarioNuevoForm() {
  clearTextErrors();
  let valid = true;

  const nombre = qs("#strNombreUsuario")?.value.trim() || "";
  const perfil = qs("#idPerfilUsuario")?.value || "";
  const pwd = qs("#strPwd")?.value.trim() || "";
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

function previewUsuarioNuevoImage() {
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

async function submitUsuarioNuevo(event) {
  event.preventDefault();

  if (!validateUsuarioNuevoForm()) return;

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
    await apiFetch("/usuarios", {
      method: "POST",
      body: formData
    });

    alert("Usuario creado correctamente");
    window.location.href = "/seguridad/usuario";
  } catch (error) {
    alert(error.message || "No se pudo crear el usuario");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();

  await loadPerfilesUsuarioNuevo();

  qs("#imagenUsuario")?.addEventListener("change", previewUsuarioNuevoImage);
  qs("#formUsuarioNuevo")?.addEventListener("submit", submitUsuarioNuevo);
});