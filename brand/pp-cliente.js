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

  // Al entrar (o volver a Inicio) la vista empieza arriba del todo.
  const toTop = () => { window.scrollTo(0, 0); document.scrollingElement && (document.scrollingElement.scrollTop = 0); const m = document.querySelector("main"); if (m) m.scrollTop = 0; };
  const realRender = renderClientPreview;
  window.renderClientPreview = function () { const r = realRender.apply(this, arguments); toTop(); requestAnimationFrame(toTop); setTimeout(toTop, 400); return r; };
  document.addEventListener("click", event => { if (event.target.closest("body > .c2-nav button:first-child")) setTimeout(toTop, 50); });

  // ------------------------------------------------------------ enviar documentos (PDF) desde el móvil
  // Los PDF llegan desde "Compartir" del móvil (sw.js) o con el botón "Subir documento". De momento
  // se guardan solo en este dispositivo (IndexedDB) y aparecen en Mis documentos › Documentos enviados.
  const FOLDERS = ["Facturas emitidas", "Facturas recibidas", "Bancos", "Otros documentos"];
  const db = () => new Promise((resolve, reject) => {
    const req = indexedDB.open("pp-documentos", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("enviados", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
  const store = async mode => (await db()).transaction("enviados", mode).objectStore("enviados");
  const asPromise = req => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); });
  const listSent = async () => (await asPromise((await store("readonly")).getAll())).sort((a, b) => b.date.localeCompare(a.date));
  const saveSent = async item => asPromise((await store("readwrite")).put(item));
  const deleteSent = async id => asPromise((await store("readwrite")).delete(id));
  const sizeText = bytes => bytes > 1048576 ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
  const dateText = iso => new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });

  function sendDialog(files) {
    document.querySelector(".pp-send-modal")?.remove();
    const modal = document.createElement("div"); modal.className = "pp-send-modal";
    modal.innerHTML = `<form class="pp-send-card"><button type="button" class="pp-send-close" aria-label="Cerrar">×</button>
      <p class="pp-send-eyebrow">ENVIAR DOCUMENTACIÓN</p><h2>${files.length > 1 ? `${files.length} documentos` : "Nuevo documento"}</h2>
      <div class="pp-send-files">${files.map(f => `<div><img src="/icons/pdf.png?v=1" alt=""><span><strong>${escapeHtml(f.name)}</strong><small>${sizeText(f.size)}</small></span></div>`).join("")}</div>
      <label><span>¿Dónde lo guardamos?</span><select>${FOLDERS.map(f => `<option>${f}</option>`).join("")}</select></label>
      <label><span>Comentario (opcional)</span><input maxlength="120" placeholder="Ej.: factura del proveedor de septiembre"></label>
      <button type="submit">Guardar en Mis documentos</button>
      <small class="pp-send-note">Vista previa: el documento se guarda solo en este dispositivo y todavía no se envía al despacho.</small></form>`;
    document.body.appendChild(modal);
    const close = () => modal.remove();
    modal.querySelector(".pp-send-close").onclick = close;
    modal.addEventListener("click", event => { if (event.target === modal) close(); });
    modal.querySelector("form").addEventListener("submit", async event => {
      event.preventDefault();
      const folder = modal.querySelector("select").value, note = modal.querySelector("input").value.trim();
      for (const file of files) await saveSent({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, name: file.name, size: file.size, folder, note, date: new Date().toISOString(), blob: file });
      close(); toast(files.length > 1 ? "Documentos guardados en Mis documentos" : "Documento guardado en Mis documentos");
      if (document.querySelector(".client-fiscal-overlay")) renderSentSection(); else openClientFiscalArea();
    });
  }
  function toast(text) {
    const t = document.createElement("div"); t.className = "pp-toast"; t.textContent = text; document.body.appendChild(t);
    setTimeout(() => t.classList.add("on"), 20); setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 300); }, 2600);
  }
  function pickFiles() {
    const input = document.createElement("input"); input.type = "file"; input.accept = "application/pdf,.pdf"; input.multiple = true;
    input.onchange = () => { const files = [...input.files].filter(f => /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name)); if (files.length) sendDialog(files); else if (input.files.length) toast("Solo se pueden enviar archivos PDF"); };
    input.click();
  }

  async function renderSentSection() {
    const content = document.querySelector(".client-fiscal-overlay .client-fiscal-content");
    const title = content?.querySelector(".client-fiscal-section-title h2")?.textContent.trim();
    if (!content || title !== "Documentación") return;
    let section = content.querySelector(".pp-sent-section");
    if (!section) {
      section = document.createElement("section"); section.className = "pp-sent-section";
      const folders = content.querySelector(".client-fiscal-folders");
      folders ? folders.after(section) : content.appendChild(section);
    }
    const items = await listSent().catch(() => []);
    section.innerHTML = `<div class="pp-sent-head"><h3>Documentos enviados</h3><button type="button" class="pp-upload-btn">＋ Subir documento</button></div>
      ${items.length ? `<div class="client-fiscal-file-list">${items.map((d, i) => `<div class="client-fiscal-file-row pp-sent-row" data-pp-icon="pdf"><span class="pp-file-icon"><img src="/icons/pdf.png?v=1" alt=""></span><span><strong>${escapeHtml(d.name)}</strong><small>${escapeHtml(d.folder)} · ${dateText(d.date)}${d.note ? " · " + escapeHtml(d.note) : ""}</small></span><button type="button" data-open="${i}">Ver</button><button type="button" class="pp-sent-del" data-del="${i}" aria-label="Eliminar">×</button></div>`).join("")}</div>`
        : `<p class="pp-sent-empty">Sube un PDF desde aquí o compártelo desde otra app del móvil (Archivos, correo, WhatsApp…) eligiendo ProPymes.</p>`}`;
    section.querySelector(".pp-upload-btn").onclick = pickFiles;
    section.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { const d = items[Number(b.dataset.open)]; openDocumentPreview(new File([d.blob], d.name, { type: "application/pdf" })); });
    section.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { const d = items[Number(b.dataset.del)]; if (confirm(`¿Eliminar «${d.name}» de este dispositivo?`)) { await deleteSent(d.id); renderSentSection(); } });
  }
  new MutationObserver(() => {
    const content = document.querySelector(".client-fiscal-overlay .client-fiscal-content");
    if (content && !content.querySelector(".pp-sent-section") && content.querySelector(".client-fiscal-folders")) renderSentSection();
  }).observe(document.body, { childList: true, subtree: true });

  // PDF recibidos desde "Compartir": se abren en cuanto se ve el área de cliente.
  async function takeShared() {
    if (!("caches" in window)) return [];
    const cache = await caches.open("pp-compartidos"), keys = await cache.keys(), files = [];
    for (const req of keys) {
      const res = await cache.match(req);
      files.push(new File([await res.blob()], decodeURIComponent(res.headers.get("X-File-Name") || "documento.pdf"), { type: "application/pdf" }));
      await cache.delete(req);
    }
    return files;
  }
  const shareFlag = (location.hash.match(/compartido=(\w+)/) || [])[1];
  if (shareFlag) history.replaceState(null, "", "/");
  let shareHandled = false;
  async function handleShare() {
    if (shareHandled || !shareFlag || !document.body.classList.contains("client-preview-mode")) return;
    if (document.querySelector(".pp-demo-modal")) return; // primero el nombre de la demo
    shareHandled = true;
    if (shareFlag !== "1") return toast("No se pudo recibir el documento. Prueba con «Subir documento».");
    const files = await takeShared();
    if (files.length) { openClientFiscalArea(); sendDialog(files); }
  }
  new MutationObserver(handleShare).observe(document.body, { childList: true, attributes: true, attributeFilter: ["class"] });

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

  const css = document.createElement("style");
  css.textContent = `
  .pp-sent-section{margin-top:22px}
  .pp-sent-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}
  .pp-sent-head h3{margin:0;font-size:16px;color:#07213d}
  .pp-upload-btn{border:0;border-radius:12px;background:#07213d;color:#fff;font:700 13px Inter,ui-sans-serif,sans-serif;padding:10px 14px;cursor:pointer}
  .pp-sent-empty{margin:0;padding:14px 16px;border:1px dashed #d9ccb6;border-radius:14px;background:#fbf8f3;color:#6b5a44;font-size:13px;line-height:1.45}
  .pp-sent-row{display:flex!important;align-items:center;gap:10px}
  .pp-sent-row>span:nth-child(2){flex:1;min-width:0;display:flex;flex-direction:column}
  .pp-sent-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pp-sent-row button{border:0;background:none;font-weight:700;font-size:13px;font-family:inherit;color:#07213d;cursor:pointer;padding:6px}
  .pp-sent-row .pp-sent-del{color:#9aa3ad;font-size:20px;line-height:1}
  .pp-send-modal{position:fixed;inset:0;z-index:3400;display:grid;place-items:center;padding:16px;background:rgba(7,33,61,.6);backdrop-filter:blur(6px);font-family:Inter,ui-sans-serif,-apple-system,"Segoe UI",sans-serif}
  .pp-send-card{position:relative;width:min(440px,100%);max-height:min(86dvh,680px);overflow:auto;background:#fbf8f3;border-radius:24px;border-top:5px solid #d2b48c;padding:24px 20px 18px;display:flex;flex-direction:column;gap:12px;color:#07213d;box-shadow:0 30px 80px rgba(0,0,0,.35)}
  .pp-send-close{position:absolute;top:12px;right:12px;width:36px;height:36px;border:0;border-radius:50%;background:#efe7db;color:#07213d;font-size:22px;cursor:pointer}
  .pp-send-eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;color:#8a6a3e}
  .pp-send-card h2{margin:0 40px 0 0;font-size:22px}
  .pp-send-files{display:flex;flex-direction:column;gap:6px}
  .pp-send-files>div{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #ece3d6;border-radius:12px;padding:8px 10px}
  .pp-send-files img{width:28px}.pp-send-files span{display:flex;flex-direction:column;min-width:0}
  .pp-send-files strong{font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pp-send-files small{color:#7b8794;font-size:12px}
  .pp-send-card label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700}
  .pp-send-card select,.pp-send-card input{height:46px;border:1px solid #d9ccb6;border-radius:12px;padding:0 12px;font-size:16px;font-family:inherit;background:#fff;color:#07213d}
  .pp-send-card button[type=submit]{height:48px;border:0;border-radius:12px;background:#07213d;color:#fff;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer}
  .pp-send-note{color:#7b8794;font-size:12px;line-height:1.4;text-align:center}
  .pp-toast{position:fixed;left:50%;bottom:calc(env(safe-area-inset-bottom,0px) + 150px);transform:translate(-50%,20px);opacity:0;z-index:3500;background:#07213d;color:#fff;padding:12px 18px;border-radius:14px;font:600 14px Inter,ui-sans-serif,sans-serif;box-shadow:0 12px 30px rgba(7,33,61,.3);transition:.25s}
  .pp-toast.on{opacity:1;transform:translate(-50%,0)}`;
  document.head.appendChild(css);
})();
