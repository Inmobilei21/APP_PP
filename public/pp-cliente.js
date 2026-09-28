/* PP · Área de cliente: la pantalla de Documentos (área fiscal) lleva en la cabecera el mismo menú
   (Inicio · Mis documentos · Mensajes · Mi perfil · Salir) y el logo grande que la página de inicio.
   Se carga después de app.js. */
(() => {
  const realOpenFiscal = openClientFiscalArea;
  window.openClientFiscalArea = function () {
    const result = realOpenFiscal.apply(this, arguments);
    const header = document.querySelector(".client-fiscal-overlay .client-fiscal-header");
    const homeBar = document.querySelector(".cd2-cab .cd2-barra");
    if (!header || !homeBar || header.querySelector(".pp-fiscal-bar")) return result;

    const bar = document.createElement("div");
    bar.className = "cd2 pp-fiscal-bar";
    ["cd2-menu", "cd2-perfil", "cd2-salir"].forEach(name => { const el = homeBar.querySelector(`.${name}`); if (el) bar.appendChild(el.cloneNode(true)); });
    const [home, docs, chat] = bar.querySelectorAll(".cd2-menu button");
    home?.classList.remove("on"); docs?.classList.add("on");
    home?.addEventListener("click", closeClientFiscalArea);
    chat?.addEventListener("click", () => openClientChat());
    bar.querySelector(".cd2-perfil")?.addEventListener("click", () => openAccountPanel());
    const exit = bar.querySelector(".cd2-salir");
    exit?.addEventListener("click", () => homeBar.querySelector(".cd2-salir")?.click());
    header.appendChild(bar);

    const logo = document.createElement("img");
    logo.className = "pp-fiscal-sello"; logo.alt = "ProPymes Asesores";
    logo.src = homeBar.closest(".cd2-cab")?.querySelector(".cd2-sello img")?.src || "/splash-logo.png";
    header.appendChild(logo);
    return result;
  };
})();
