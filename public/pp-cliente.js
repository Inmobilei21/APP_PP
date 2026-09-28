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

  // "Más info." de Otros servicios: el mismo aviso que en Inicio (servicio no contratado).
  const fiscalBase = window.openClientFiscalArea;
  window.openClientFiscalArea = function () {
    const result = fiscalBase.apply(this, arguments);
    document.querySelectorAll(".client-fiscal-overlay .client-fiscal-service-actions").forEach(actions => {
      const info = actions.querySelector("button:first-child"), title = actions.closest("article")?.querySelector("strong")?.textContent.trim();
      if (!info || !title || info.dataset.ppInfo) return;
      const fresh = info.cloneNode(true); fresh.dataset.ppInfo = "1"; fresh.removeAttribute("title");
      fresh.addEventListener("click", () => openClientUnavailable(title));
      info.replaceWith(fresh);
    });
    return result;
  };

  // ------------------------------------------------------------ móvil
  const isMobile = () => matchMedia("(max-width:760px)").matches;

  // Cabecera arena como la de Inicio: logo, avatar, "Área de cliente" y el título de la sección.
  function mobileHeader(title) {
    const head = document.createElement("div"); head.className = "pp-m-head";
    const top = document.querySelector(".client-portal-header .c2-top");
    head.innerHTML = `<div class="pp-m-top"></div><p class="pp-m-eyebrow">Área de cliente</p><h1 class="pp-m-title">${escapeHtml(title)}</h1>`;
    if (top) {
      const logo = top.querySelector("img")?.cloneNode(true); if (logo) head.firstChild.appendChild(logo);
      const avatar = top.querySelector(".profile")?.cloneNode(true);
      if (avatar) { avatar.addEventListener("click", () => openAccountPanel()); head.firstChild.appendChild(avatar); }
    }
    return head;
  }

  const fiscalWithMenu = window.openClientFiscalArea;
  window.openClientFiscalArea = function () {
    const result = fiscalWithMenu.apply(this, arguments);
    const view = document.querySelector(".client-fiscal-overlay .client-fiscal-view");
    if (view && !view.querySelector(".pp-m-head")) view.insertBefore(mobileHeader("Mis documentos"), view.firstChild);
    setActive(2);
    return result;
  };

  const realOpenChat = openClientChat;
  window.openClientChat = function () {
    const result = realOpenChat.apply(this, arguments);
    const view = document.querySelector(".client-chat-overlay .client-chat-view");
    if (view && !view.querySelector(".pp-m-head")) view.insertBefore(mobileHeader("Mensajes"), view.firstChild);
    setActive(3);
    return result;
  };

  // Barra inferior: siempre visible y cada botón lleva a su sección.
  function setActive(index) {
    document.querySelectorAll("body > .c2-nav button").forEach((button, i) => button.classList.toggle("active", i + 1 === index));
  }
  function closeSections() {
    try { closeDocumentPreview(); } catch {}
    closeClientChat(); closeClientFiscalArea(); closeClientDocuments();
  }
  document.addEventListener("click", event => {
    const button = event.target.closest("body > .c2-nav button"); if (!button) return;
    const index = [...button.parentElement.children].indexOf(button) + 1;
    if (index === 4) return; // Perfil: se abre encima de lo que haya
    closeSections();
    if (index === 1) { setActive(1); event.stopImmediatePropagation(); event.preventDefault(); }
  }, true);
  const realCloseFiscal = closeClientFiscalArea, realCloseChat = closeClientChat;
  window.closeClientFiscalArea = function () { const r = realCloseFiscal.apply(this, arguments); if (!document.querySelector(".client-chat-overlay")) setActive(1); return r; };
  window.closeClientChat = function () { const r = realCloseChat.apply(this, arguments); if (!document.querySelector(".client-fiscal-overlay")) setActive(1); return r; };

  // Iconos oficiales (PDF, Word, Excel) en las filas de documentos del área de cliente.
  function officialIcons(root) {
    root.querySelectorAll(".client-fiscal-file-row:not([data-pp-icon])").forEach(row => {
      const name = row.querySelector("strong")?.textContent || "", icon = row.querySelector(".client-ui-icon");
      if (!icon) return;
      const kind = /\.(docx?|dotx?)$/i.test(name) ? "word" : /\.(xlsx?|xlsm|csv)$/i.test(name) ? "excel" : /\.pdf$/i.test(name) ? "pdf" : "";
      row.dataset.ppIcon = kind || "none";
      if (kind) icon.outerHTML = `<span class="pp-file-icon"><img src="/icons/${kind}.png?v=1" alt="" draggable="false"></span>`;
    });
  }
  new MutationObserver(() => { const overlay = document.querySelector(".client-fiscal-overlay"); if (overlay) officialIcons(overlay); })
    .observe(document.body, { childList: true, subtree: true });
})();
