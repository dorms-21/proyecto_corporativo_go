function validateModuloNuevoForm() {
  clearTextErrors();
  let valid = true;

  const nombre = qs("#strNombreModulo")?.value.trim() || "";
  const clave = qs("#strClaveModulo")?.value.trim() || "";
  const ruta = qs("#strRutaModulo")?.value.trim() || "";

  if (!nombre) {
    showTextError("errorNombreModulo", "El nombre es obligatorio");
    valid = false;
  }

  if (!clave) {
    showTextError("errorClaveModulo", "La clave es obligatoria");
    valid = false;
  }

  if (!ruta) {
    showTextError("errorRutaModulo", "La ruta es obligatoria");
    valid = false;
  }

  return valid;
}

async function submitModuloNuevo(event) {
  event.preventDefault();

  if (!validateModuloNuevoForm()) return;

  const payload = {
    strNombreModulo: qs("#strNombreModulo").value.trim(),
    strClaveModulo: qs("#strClaveModulo").value.trim(),
    strRuta: qs("#strRutaModulo").value.trim(),
    bitEstatico: qs("#bitEstaticoModulo").checked
  };

  try {
    await apiFetch("/modulos", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    alert("Módulo creado correctamente");
    window.location.href = "/seguridad/modulo";
  } catch (error) {
    alert(error.message || "No se pudo crear el módulo");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();

  qs("#formModuloNuevo")?.addEventListener("submit", submitModuloNuevo);
});