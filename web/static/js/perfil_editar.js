function getPerfilIdFromUrl() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1];
}

async function loadPerfil() {
  const id = getPerfilIdFromUrl();
  qs("#perfilId").value = id;

  try {
    const data = await apiFetch(`/perfiles/${id}`, { method: "GET" });
    qs("#strNombrePerfil").value = data.strNombrePerfil || "";
    qs("#bitAdministrador").checked = !!data.bitAdministrador;
  } catch (error) {
    alert(error.message);
    window.location.href = "/seguridad/perfil";
  }
}

async function submitPerfilEditar(event) {
  event.preventDefault();
  clearTextErrors();

  const id = qs("#perfilId").value;
  const nombre = qs("#strNombrePerfil").value.trim();

  if (!nombre) {
    showTextError("errorNombrePerfil", "El nombre es obligatorio");
    return;
  }

  try {
    await apiFetch(`/perfiles/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        strNombrePerfil: nombre,
        bitAdministrador: qs("#bitAdministrador").checked
      })
    });

    window.location.href = "/seguridad/perfil";
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
  loadPerfil();

  qs("#formPerfilEditar")?.addEventListener("submit", submitPerfilEditar);
});