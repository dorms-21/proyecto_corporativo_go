function getModuloIdFromUrl() {
  const parts = window.location.pathname.split("/");
  return parts[parts.length - 1];
}

function validateModuloEditarForm() {
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

async function loadModuloEditar() {
  const id = getModuloIdFromUrl();
  qs("#moduloId").value = id;

  try {
    const data = await apiFetch(`/modulos/${id}`, { method: "GET" });

    qs("#strNombreModulo").value = data.strNombreModulo || "";
    qs("#strClaveModulo").value = data.strClaveModulo || "";
    qs("#strRutaModulo").value = data.strRuta || "";
    qs("#bitEstaticoModulo").checked = !!data.bitEstatico;
  } catch (error) {
    alert(error.message || "No se pudo cargar el módulo");
    window.location.href = "/seguridad/modulo";
  }
}

async function submitModuloEditar(event) {
  event.preventDefault();

  if (!validateModuloEditarForm()) return;

  const id = qs("#moduloId").value;

  const payload = {
    strNombreModulo: qs("#strNombreModulo").value.trim(),
    strClaveModulo: qs("#strClaveModulo").value.trim(),
    strRuta: qs("#strRutaModulo").value.trim(),
    bitEstatico: qs("#bitEstaticoModulo").checked
  };

  try {
    await apiFetch(`/modulos/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });

    alert("Módulo actualizado correctamente");
    window.location.href = "/seguridad/modulo";
  } catch (error) {
    alert(error.message || "No se pudo actualizar el módulo");
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();

  await loadModuloEditar();

  qs("#formModuloEditar")?.addEventListener("submit", submitModuloEditar);
});