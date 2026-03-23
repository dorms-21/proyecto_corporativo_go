function validatePerfilNuevoForm() {
  clearTextErrors();
  let valid = true;

  const nombre = qs("#strNombrePerfil")?.value.trim() || "";

  if (!nombre) {
    showTextError("errorNombrePerfil", "El nombre del perfil es obligatorio");
    valid = false;
  }

  return valid;
}

async function submitPerfilNuevo(event) {
  event.preventDefault();

  if (!validatePerfilNuevoForm()) return;

  const payload = {
    strNombrePerfil: qs("#strNombrePerfil").value.trim(),
    bitAdministrador: qs("#bitAdministrador").checked
  };

  try {
    await apiFetch("/perfiles", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    alert("Perfil creado correctamente");
    window.location.href = "/seguridad/perfil";
  } catch (error) {
    alert(error.message || "No se pudo crear el perfil");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();

  qs("#formPerfilNuevo")?.addEventListener("submit", submitPerfilNuevo);
});