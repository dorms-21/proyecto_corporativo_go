const API_BASE = "/api";

function qs(selector) {
  return document.querySelector(selector);
}

function qsa(selector) {
  return document.querySelectorAll(selector);
}

function getToken() {
  return localStorage.getItem("token") || "";
}

function setToken(token) {
  localStorage.setItem("token", token);
}

function removeToken() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("menus");
  localStorage.removeItem("permissions");
}

function saveUser(user) {
  localStorage.setItem("user", JSON.stringify(user || {}));
}

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch (e) {
    return {};
  }
}

function saveMenus(menus) {
  localStorage.setItem("menus", JSON.stringify(menus || []));
}

function getMenus() {
  try {
    return JSON.parse(localStorage.getItem("menus")) || [];
  } catch (e) {
    return [];
  }
}

function savePermissions(permissions) {
  localStorage.setItem("permissions", JSON.stringify(permissions || {}));
}

function getPermissions() {
  try {
    return JSON.parse(localStorage.getItem("permissions")) || {};
  } catch (e) {
    return {};
  }
}

function logout() {
  removeToken();
  window.location.href = "/login";
}

function bindLogout() {
  const btn = qs("#btnLogout");
  if (btn) {
    btn.addEventListener("click", logout);
  }
}

function setTopbarUser() {
  const user = getUser();
  const el = qs("#topbarUser");
  if (el) {
    el.textContent = user.strNombreUsuario || user.username || "Usuario";
  }
}

function showElement(selector) {
  const el = typeof selector === "string" ? qs(selector) : selector;
  if (el) el.classList.remove("hidden");
}

function hideElement(selector) {
  const el = typeof selector === "string" ? qs(selector) : selector;
  if (el) el.classList.add("hidden");
}

function showTextError(id, message) {
  const el = qs(`#${id}`);
  if (el) el.textContent = message || "";
}

function clearTextErrors() {
  qsa(".error-text").forEach(el => {
    el.textContent = "";
  });
}

function showAlert(id, message, type = "danger") {
  const el = qs(`#${id}`);
  if (!el) return;
  el.className = `alert alert-${type}`;
  el.textContent = message;
  el.classList.remove("hidden");
}

function hideAlert(id) {
  const el = qs(`#${id}`);
  if (el) el.classList.add("hidden");
}

async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (response.status === 401) {
    logout();
    throw new Error("Sesión expirada");
  }

  const contentType = response.headers.get("content-type") || "";
  const data = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = data?.message || data?.msg || "Ocurrió un error";
    throw new Error(message);
  }

  return data;
}

function toBooleanBadge(value) {
  return value
    ? '<span class="badge badge-success">Sí</span>'
    : '<span class="badge badge-danger">No</span>';
}

function toStatusBadge(value) {
  const text = `${value}`.toUpperCase();
  if (text === "ACTIVO" || text === "1") {
    return '<span class="badge badge-success">Activo</span>';
  }
  return '<span class="badge badge-danger">Inactivo</span>';
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildPagination(containerId, currentPage, totalPages, callbackName) {
  const container = qs(`#${containerId}`);
  if (!container) return;

  container.innerHTML = "";

  if (!totalPages || totalPages <= 1) return;

  for (let page = 1; page <= totalPages; page++) {
    const btn = document.createElement("button");
    btn.textContent = page;
    if (page === currentPage) {
      btn.classList.add("active");
    }
    btn.addEventListener("click", () => window[callbackName](page));
    container.appendChild(btn);
  }
}

function formatImageUrl(path) {
  if (!path) return "/static/img/user-default.png";
  if (path.startsWith("http")) return path;
  return path;
}

async function verifySession() {
  const token = getToken();
  if (!token) {
    if (location.pathname !== "/login") {
      window.location.href = "/login";
    }
    return false;
  }

  try {
    const data = await apiFetch("/auth/me", { method: "GET" });
    if (data.user) saveUser(data.user);
    if (data.menus) saveMenus(data.menus);
    if (data.permissions) savePermissions(data.permissions);
    return true;
  } catch (error) {
    logout();
    return false;
  }
}