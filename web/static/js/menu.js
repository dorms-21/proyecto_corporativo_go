function renderMenu() {
  const container = qs("#sidebarMenu");
  if (!container) return;

  const menus = getMenus();
  const currentPath = window.location.pathname;

  container.innerHTML = "";

  menus.forEach(group => {
    if (!group.modulos || !group.modulos.length) return;

    const wrapper = document.createElement("div");
    wrapper.className = "menu-group";

    const header = document.createElement("button");
    header.type = "button";
    header.className = "menu-group-header";
    header.innerHTML = `<span>${escapeHtml(group.menu || group.nombre || "Menú")}</span><span>▾</span>`;

    const body = document.createElement("div");
    body.className = "menu-group-body";

    let hasActive = false;

    group.modulos.forEach(modulo => {
      const link = document.createElement("a");
      const path = modulo.ruta || "#";
      link.href = path;
      link.className = "menu-link";
      link.textContent = modulo.nombre || modulo.strNombreModulo || "Módulo";

      if (currentPath === path) {
        link.classList.add("active");
        hasActive = true;
      }

      body.appendChild(link);
    });

    header.addEventListener("click", () => {
      wrapper.classList.toggle("active");
    });

    wrapper.appendChild(header);
    wrapper.appendChild(body);

    if (hasActive) {
      wrapper.classList.add("active");
    }

    container.appendChild(wrapper);
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  if (location.pathname === "/login") return;

  const ok = await verifySession();
  if (!ok) return;

  setTopbarUser();
  bindLogout();
  renderMenu();
});