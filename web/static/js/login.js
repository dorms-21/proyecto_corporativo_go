let currentCaptcha = "";

function generateCaptcha() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let captcha = "";
  for (let i = 0; i < 4; i++) {
    captcha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  currentCaptcha = captcha;
  const preview = qs("#captchaPreview");
  if (preview) preview.textContent = captcha;
}

function validateLoginForm() {
  clearTextErrors();
  hideAlert("loginError");

  const usuario = qs("#usuario")?.value.trim() || "";
  const password = qs("#password")?.value.trim() || "";
  const captcha = qs("#captcha")?.value.trim().toUpperCase() || "";

  let valid = true;

  if (!usuario) {
    showTextError("errorUsuario", "El usuario es obligatorio");
    valid = false;
  }

  if (!password) {
    showTextError("errorPassword", "La contraseña es obligatoria");
    valid = false;
  }

  if (!captcha) {
    showTextError("errorCaptcha", "El captcha es obligatorio");
    valid = false;
  } else if (captcha !== currentCaptcha) {
    showTextError("errorCaptcha", "Captcha incorrecto");
    valid = false;
  }

  return valid;
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  if (!validateLoginForm()) return;

  const payload = {
    usuario: qs("#usuario").value.trim(),
    password: qs("#password").value.trim(),
    captcha: qs("#captcha").value.trim().toUpperCase()
  };

  console.log("intentando login con:", payload.usuario);

  try {
    const data = await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    console.log("respuesta login:", data);

    if (data.token) setToken(data.token);
    if (data.user) saveUser(data.user);
    if (data.menus) saveMenus(data.menus);
    if (data.permissions) savePermissions(data.permissions);

    window.location.href = "/dashboard";
  } catch (error) {
    console.error("error login:", error);
    showAlert("loginError", error.message || "No fue posible iniciar sesión");
    generateCaptcha();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  removeToken();
  generateCaptcha();

  const form = qs("#formLogin");
  if (form) {
    form.addEventListener("submit", handleLoginSubmit);
  }

  const refreshBtn = qs("#btnRefreshCaptcha");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", generateCaptcha);
  }
});