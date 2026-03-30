document.addEventListener("DOMContentLoaded", async () => {
  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();
  applyStaticPermissions();
});

function applyStaticPermissions() {
  const moduleName = document.body.dataset.module;
  const permissions = getPermissions();

  if (!moduleName || !permissions || !permissions[moduleName]) return;

  const perms = permissions[moduleName];

  if (!perms.agregar) hideButtonsByText("Nuevo");
  if (!perms.consulta) hideButtonsByText("Consultar");
  if (!perms.editar) hideButtonsByText("Editar");
  if (!perms.eliminar) hideButtonsByText("Eliminar");
  if (!perms.detalle) hideButtonsByText("Detalle");

  if (!perms.agregar && !perms.editar) {
    hideButtonsByText("Guardar");
  }

  if (!perms.consulta) {
    const tables = document.querySelectorAll(".table-responsive, table");
    tables.forEach(el => el.style.display = "none");
  }
}

function hideButtonsByText(text) {
  document.querySelectorAll("button, a.btn").forEach(el => {
    const content = (el.textContent || "").trim().toLowerCase();
    if (content === text.toLowerCase()) {
      el.style.display = "none";
    }
  });
}