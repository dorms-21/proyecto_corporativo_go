let moduloPage = 1;
const moduloLimit = 5;

function toggleModuloForm(show = false) {
  qs("#formModulo")?.classList.toggle("hidden", !show);
}

function resetModuloForm() {
  qs("#formModulo")?.reset();
  if (qs("#moduloId")) qs("#moduloId").value = "";
  clearTextErrors();
}

function validateModuloForm() {
  clearTextErrors();
  let valid = true;

  if (!qs("#strNombreModulo").value.trim()) {
    showTextError("errorNombreModulo", "El nombre es obligatorio");
    valid = false;
  }

  if (!qs("#strClaveModulo").value.trim()) {
    showTextError("errorClaveModulo", "La clave es obligatoria");
    valid = false;
  }

  if (!qs("#strRutaModulo").value.trim()) {
    showTextError("errorRutaModulo", "La ruta es obligatoria");
    valid = false;
  }

  return valid;
}

function renderModulos(rows = []) {
  const tbody = qs("#tablaModulos");
  if (!tbody) return;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Sin datos</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(row => `
    <tr>
      <td>${row.id}</td>
      <td>${escapeHtml(row.strNombreModulo || row.str_nombre_modulo || "")}</td>
      <td>${escapeHtml(row.strClaveModulo || row.str_clave_modulo || "")}</td>
      <td>${escapeHtml(row.strRuta || row.str_ruta || "")}</td>
      <td>${toBooleanBadge(row.bitEstatico ?? row.bit_estatico)}</td>
      <td>
        <div class="table-actions">
          <button class="btn btn-info btn-table" onclick='editModulo(${JSON.stringify(row)})'>Editar</button>
          <button class="btn btn-danger btn-table" onclick="deleteModulo(${row.id})">Eliminar</button>
        </div>
      </td>
    </tr>
  `).join("");
}

async function loadModulos(page = 1) {
  moduloPage = page;
  try {
    const offset = (page - 1) * moduloLimit;
    const data = await apiFetch(`/modulos?limit=${moduloLimit}&offset=${offset}`, { method: "GET" });

    renderModulos(data.rows || []);
    buildPagination("paginacionModulos", page, data.totalPages || 1, "loadModulos");
  } catch (error) {
    console.error(error);
  }
}

function editModulo(row) {
  toggleModuloForm(true);
  qs("#moduloId").value = row.id || "";
  qs("#strNombreModulo").value = row.strNombreModulo || row.str_nombre_modulo || "";
  qs("#strClaveModulo").value = row.strClaveModulo || row.str_clave_modulo || "";
  qs("#strRutaModulo").value = row.strRuta || row.str_ruta || "";
  qs("#bitEstaticoModulo").checked = !!(row.bitEstatico ?? row.bit_estatico);
}

async function deleteModulo(id) {
  if (!confirm("¿Deseas eliminar este módulo?")) return;

  try {
    await apiFetch(`/modulos/${id}`, { method: "DELETE" });
    await loadModulos(moduloPage);
  } catch (error) {
    alert(error.message);
  }
}

async function submitModulo(event) {
  event.preventDefault();
  if (!validateModuloForm()) return;

  const id = qs("#moduloId").value;
  const payload = {
    strNombreModulo: qs("#strNombreModulo").value.trim(),
    strClaveModulo: qs("#strClaveModulo").value.trim(),
    strRuta: qs("#strRutaModulo").value.trim(),
    bitEstatico: qs("#bitEstaticoModulo").checked
  };

  try {
    if (id) {
      await apiFetch(`/modulos/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });
    } else {
      await apiFetch("/modulos", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }

    resetModuloForm();
    toggleModuloForm(false);
    await loadModulos(moduloPage);
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
  loadModulos();

  qs("#btnNuevoModulo")?.addEventListener("click", () => {
    resetModuloForm();
    toggleModuloForm(true);
  });

  qs("#btnCancelarModulo")?.addEventListener("click", () => {
    resetModuloForm();
    toggleModuloForm(false);
  });

  qs("#formModulo")?.addEventListener("submit", submitModulo);
});