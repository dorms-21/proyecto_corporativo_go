document.addEventListener("DOMContentLoaded", () => {
  const breadcrumb = qs("#breadcrumbContainer");
  if (!breadcrumb) return;

  const path = location.pathname.split("/").filter(Boolean);
  breadcrumb.innerHTML = '<a href="/dashboard">Inicio</a>';

  let acc = "";
  path.forEach((part, index) => {
    acc += `/${part}`;
    const sep = document.createElement("span");
    sep.textContent = "/";
    breadcrumb.appendChild(sep);

    const formatted = part
      .replaceAll("-", " ")
      .replaceAll("_", " ")
      .replace(/\b\w/g, c => c.toUpperCase());

    if (index === path.length - 1) {
      const span = document.createElement("span");
      span.className = "current";
      span.textContent = formatted;
      breadcrumb.appendChild(span);
    } else {
      const link = document.createElement("a");
      link.href = acc;
      link.textContent = formatted;
      breadcrumb.appendChild(link);
    }
  });
});