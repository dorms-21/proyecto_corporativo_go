let perfilPage = 1;
const perfilLimit = 5;

function togglePerfilForm(show = false) {
  const form = qs("#formPerfil");
  if (!form) return;
  form.classList.toggle("hidden", !show);
}

function resetPerfilForm() {
  const form = qs("#formPerfil");
  if (form) form.reset();
  const id = qs("#perfilId");
  if (id) id.value = "";
  clearTextErrors();
}

function validatePerfilForm() {
  clearTextErrors();
  const nombre = qs("#strNombrePerfil")?.value.trim() || "";
  let valid = true;

  if (!nombre) {
    showTextError("errorNombrePerfil", "El nombre del perfil es obligatorio");
    valid = false;
  }

  return valid;
}

function renderPerfiles(rows = []) {
  const tbody = qs("#tablaPerfiles");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.id}</td>
      <td>${escapeHtml(row.strNombrePerfil || row.str_nombSre_perfil || "")}</td>
      <td>${toBooleanBadge(row.bitAdministrador ?? row.bit_administrador)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-info btn-table" onclick="goEditPerfil(${row.id})">Editar</button>
          <button class="btn btn-danger btn-table" onclick="deletePerfil(${row.id})">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadPerfiles(page = 1) {
  perfilPage = page;
  try {
    const offset = (page - 1) * perfilLimit;
    const data = await apiFetch(`/perfiles?limit=${perfilLimit}&offset=${offset}`, { method: "GET" });

    renderPerfiles(data.rows || []);
    buildPagination("paginacionPerfiles", page, data.totalPages || 1, "loadPerfiles");
  } catch (error) {
    console.error(error);
  }
}

function goEditPerfil(id) {
  window.location.href = `/seguridad/perfil/editar/${id}`;
}

function editPerfil(row) {
  togglePerfilForm(true);
  qs("#perfilId").value = row.id || "";
  qs("#strNombrePerfil").value = row.strNombrePerfil || row.str_nombre_perfil || "";
  qs("#bitAdministrador").checked = !!(row.bitAdministrador ?? row.bit_administrador);
}

async function deletePerfil(id) {
  if (!confirm("¿Deseas eliminar este perfil?")) return;

  try {
    await apiFetch(`/perfiles/${id}`, { method: "DELETE" });
    await loadPerfiles(perfilPage);
  } catch (error) {
    alert(error.message);
  }
}

async function submitPerfil(event) {
  event.preventDefault();
  if (!validatePerfilForm()) return;

  const id = qs("#perfilId").value;
  const payload = {
    strNombrePerfil: qs("#strNombrePerfil").value.trim(),
    bitAdministrador: qs("#bitAdministrador").checked
  };

  try {
    if (id) {
      await apiFetch(`/perfiles/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/perfiles", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetPerfilForm();
    togglePerfilForm(false);
    await loadPerfiles(perfilPage);
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
  loadPerfiles();

  qs("#btnNuevoPerfil")?.addEventListener("click", () => {
    resetPerfilForm();
    togglePerfilForm(true);
  });

  qs("#btnCancelarPerfil")?.addEventListener("click", () => {
    resetPerfilForm();
    togglePerfilForm(false);
  });

  qs("#formPerfil")?.addEventListener("submit", submitPerfil);
});