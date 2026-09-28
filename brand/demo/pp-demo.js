/* PP · Demostración del área de cliente.
   Con el usuario "Cliente" se entra solo en la vista de cliente: se pide el nombre de la empresa o
   persona, se usa en toda la vista y cada apartado muestra documentos PDF ficticios (lorem ipsum).
   Se carga después de app.js y sustituye algunas funciones solo cuando la sesión es de demostración. */
(() => {
  const DEMO_ID = "cliente", NAME_KEY = "ppDemoNombre", CHAT_KEY = "ppDemoChat";
  const isDemo = () => signedInUser?.role === "demo";
  const storage = {
    get: key => { try { return localStorage.getItem(key) || ""; } catch { return ""; } },
    set: (key, value) => { try { localStorage.setItem(key, value); } catch {} },
    remove: key => { try { localStorage.removeItem(key); } catch {} }
  };

  // ------------------------------------------------------------ documentos ficticios
  let DOCS = [];
  const docsReady = fetch("/demo/documentos.json?v=pp8").then(r => r.json()).then(list => {
    DOCS = list.map(doc => ({ ...doc, file: `/demo/${doc.file}`, name: `${doc.title}.pdf` }));
  }).catch(() => {});
  const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const shortDate = iso => { const [y, m, d] = iso.split("-"); return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`; };

  async function openDemoDocument(doc) {
    const blob = await (await fetch(doc.file)).blob();
    openDocumentPreview(new File([blob], doc.name, { type: "application/pdf" }));
  }
  function rowMarkup(doc, index) {
    return `<button type="button" class="client-document-row" data-pp-demo-doc="${index}" data-search="${escapeHtml(`${doc.title} ${doc.folder}`.toLocaleLowerCase("es"))}">${documentTypeVisual(doc.name)}<span><strong>${escapeHtml(doc.title)}</strong><small>${escapeHtml(doc.folder)} · ${shortDate(doc.date)}</small></span><b>Ver</b></button>`;
  }
  function bindRows(root, docs) {
    root.querySelectorAll("[data-pp-demo-doc]").forEach(button => button.addEventListener("click", () => openDemoDocument(docs[Number(button.dataset.ppDemoDoc)])));
  }

  // ------------------------------------------------------------ API: la demo no toca datos reales
  const realApiJson = apiJson;
  const chatStore = () => { try { return JSON.parse(storage.get(CHAT_KEY) || "{}"); } catch { return {}; } };
  window.apiJson = async function (url, options = {}) {
    let body = {};
    try { body = JSON.parse(options.body || "{}"); } catch {}
    if (url === "/api/auth/login" && body.userId === DEMO_ID) {
      const result = await realApiJson("/api/pp-demo/login", { method: "POST", body: JSON.stringify({ password: body.password }) });
      storage.remove(NAME_KEY); storage.remove(CHAT_KEY);
      setTimeout(startDemo, 1500);
      return result;
    }
    if (!isDemo() || url.startsWith("/api/auth/") || url.startsWith("/api/version")) return realApiJson(url, options);
    // Chat de la demo: se guarda solo en este navegador y contesta un mensaje automático.
    if (url.startsWith("/api/client-chat/messages")) {
      const chats = chatStore();
      if ((options.method || "GET") === "GET") return chats[new URL(url, location.origin).searchParams.get("with")] || [];
      const list = chats[body.recipientId] || (chats[body.recipientId] = []), now = new Date().toISOString();
      list.push({ id: `${Date.now()}`, senderId: `client:${clientPreviewName}`, text: body.text, createdAt: now, readAt: now });
      list.push({ id: `${Date.now()}r`, senderId: body.recipientId, text: "Gracias por tu mensaje. Esto es una demostración: en la versión definitiva tu asesor te responderá aquí.", createdAt: now });
      storage.set(CHAT_KEY, JSON.stringify(chats));
      return list;
    }
    return (options.method || "GET") === "GET" ? [] : {};
  };

  // ------------------------------------------------------------ vista de cliente
  const realOpenDocuments = openClientDocuments, realOpenFiscal = openClientFiscalArea, realAccount = openAccountPanel, realClose = closeClientPreview;

  // Todas las pantallas de documentos del área de cliente leen de aquí: en la demo, los PDF ficticios.
  const realFiscalDocuments = clientFiscalDocuments;
  window.clientFiscalDocuments = async function () {
    if (!isDemo()) return realFiscalDocuments.apply(this, arguments);
    await docsReady;
    return DOCS.map(doc => ({ name: doc.name, path: doc.path, handle: { getFile: async () => new File([await (await fetch(doc.file)).blob()], doc.name, { type: "application/pdf" }) } }));
  };
  window.openClientDocuments = async function () {
    if (!isDemo()) return realOpenDocuments.apply(this, arguments);
    closeClientDocuments(); await realOpenDocuments(); await docsReady;
    const overlay = document.querySelector(".client-documents-overlay"); if (!overlay) return;
    const list = overlay.querySelector(".client-documents-list"), search = overlay.querySelector("input");
    list.innerHTML = DOCS.map(rowMarkup).join(""); bindRows(list, DOCS);
    const fresh = search.cloneNode(true); search.replaceWith(fresh);
    fresh.addEventListener("input", () => { const q = fresh.value.trim().toLocaleLowerCase("es"); list.querySelectorAll(".client-document-row").forEach(row => row.hidden = Boolean(q && !row.dataset.search.includes(q))); });
  };

  window.openClientFiscalArea = function () {
    const result = realOpenFiscal.apply(this, arguments);
    if (!isDemo()) return result;
    const content = document.querySelector(".client-fiscal-overlay .client-fiscal-content");
    if (!content) return result;
    const section = (title, docs) => {
      const box = document.createElement("section"); box.className = "pp-demo-section";
      box.innerHTML = `<h3>${escapeHtml(title)}</h3><div class="client-fiscal-file-list">${docs.map((doc, i) => `<button type="button" class="client-fiscal-file-row" data-pp-demo-doc="${i}">${clientDesktopIcon("file")}<span><strong>${escapeHtml(doc.name)}</strong><small>${escapeHtml(doc.folder)} · ${shortDate(doc.date)}</small></span><b>Ver</b></button>`).join("")}</div>`;
      bindRows(box, docs); return box;
    };
    const fill = async () => {
      await docsReady;
      const title = content.querySelector(".client-fiscal-section-title h2")?.textContent.trim();
      if (title === "Documentación" && !content.querySelector(".pp-demo-section") && content.querySelector(".client-fiscal-folders"))
        content.appendChild(section("Contabilidad", DOCS.filter(doc => doc.folder === "Contabilidad")));
      const empty = content.querySelector(".client-fiscal-empty");
      if (title === "Reclamaciones" && empty) { const docs = DOCS.filter(doc => doc.folder === "Reclamaciones"), box = section("Comunicaciones con la Agencia Tributaria", docs); empty.replaceWith(box); }
    };
    new MutationObserver(fill).observe(content, { childList: true }); fill();
    return result;
  };

  window.closeClientPreview = function () { if (!isDemo()) return realClose.apply(this, arguments); };
  window.openAccountPanel = function () { if (!isDemo()) return realAccount.apply(this, arguments); openDemoPanel(); };

  async function decorateHome() {
    await docsReady;
    const recent = [...DOCS].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    const card = [...document.querySelectorAll(".cd2-tarjeta")].find(el => /Últimos documentos/.test(el.textContent));
    if (card) {
      card.querySelector(".cd2-tcab small").textContent = recent.length;
      card.querySelector(".cd2-lista").innerHTML = recent.map((doc, i) => `<div class="cd2-fila pp-demo-clickable" data-pp-demo-doc="${i}"><span class="cd2-pdf cd2-logo"><img src="/icons/pdf.png?v=1" alt="" draggable="false"></span><span class="cd2-txt"><b>${escapeHtml(doc.title)}</b><span>Asesoría Fiscal y Contable › ${escapeHtml(doc.folder)}</span></span><time>${shortDate(doc.date)}</time></div>`).join("");
      bindRows(card, recent);
    }
    const first = document.querySelector(".cd2-tarjeta .cd2-nuevo-msg p") || document.querySelector(".client-desktop-message p");
    if (first && recent[0]) first.textContent = `Se ha añadido nueva documentación: ${recent[0].title}. Puedes consultarla en tu área de documentos.`;
    document.querySelectorAll(".cd2-salir,.client-desktop-logout").forEach(button => { button.removeAttribute("aria-disabled"); button.onclick = logoutDemo; });
    fixLabels();
  }
  function fixLabels() {
    if (!isDemo()) return;
    document.querySelectorAll(".profile small, .client-fiscal-profile small").forEach(small => { if (/Administrador|Usuario|Visión cliente/.test(small.textContent)) small.textContent = "Área de cliente"; });
  }

  // ------------------------------------------------------------ nombre del cliente
  function applyName(name) {
    clientPreviewName = name; signedInUser.name = name;
    renderClientPreview(); decorateHome(); ribbon();
  }
  function askName() {
    document.querySelector(".pp-demo-modal")?.remove();
    const modal = document.createElement("div"); modal.className = "pp-demo-modal";
    modal.innerHTML = `<form class="pp-demo-card"><img src="/logo-pp.png?v=pp7" alt="ProPymes Asesores"><p class="pp-demo-eyebrow">VERSIÓN DE DEMOSTRACIÓN</p><h2>¡Bienvenido a tu área de cliente!</h2><p>Para personalizar la demostración, escribe el nombre de tu empresa o tu nombre y apellidos.</p><label><span>Empresa o persona física</span><input name="nombre" required maxlength="80" autocomplete="organization" placeholder="Ej.: Talleres García, S.L."></label><button type="submit">Ver mi área de cliente</button><small>Los documentos que verás son de ejemplo. No adjuntes documentación real en esta versión.</small></form>`;
    document.body.appendChild(modal);
    const input = modal.querySelector("input"); input.value = storage.get(NAME_KEY); setTimeout(() => input.focus(), 50);
    modal.querySelector("form").addEventListener("submit", event => {
      event.preventDefault(); const name = input.value.trim().replace(/\s+/g, " "); if (!name) return;
      storage.set(NAME_KEY, name); modal.remove(); applyName(name);
    });
  }
  function openDemoPanel() {
    document.querySelector(".pp-demo-modal")?.remove();
    const modal = document.createElement("div"); modal.className = "pp-demo-modal";
    modal.innerHTML = `<div class="pp-demo-card"><p class="pp-demo-eyebrow">MI PERFIL · DEMOSTRACIÓN</p><h2>${escapeHtml(clientPreviewName)}</h2><p>Estás viendo una demostración del área de cliente de ProPymes Asesores.</p><button type="button" data-rename>Cambiar nombre</button><button type="button" class="pp-demo-secondary" data-logout>Cerrar sesión</button><button type="button" class="pp-demo-link" data-close>Volver</button></div>`;
    document.body.appendChild(modal);
    modal.querySelector("[data-rename]").onclick = askName;
    modal.querySelector("[data-logout]").onclick = logoutDemo;
    modal.querySelector("[data-close]").onclick = () => modal.remove();
  }
  function ribbon() {
    document.querySelector(".pp-demo-ribbon")?.remove();
    const tag = document.createElement("button"); tag.type = "button"; tag.className = "pp-demo-ribbon";
    tag.innerHTML = `<b>DEMO</b><span>${escapeHtml(clientPreviewName)}</span>`; tag.onclick = openDemoPanel;
    document.body.appendChild(tag);
  }
  async function logoutDemo() {
    try { await realApiJson("/api/auth/logout", { method: "POST" }); } catch {}
    storage.remove(NAME_KEY); storage.remove(CHAT_KEY); location.reload();
  }

  function startDemo() {
    if (!isDemo() || document.documentElement.classList.contains("pp-demo-activa")) return;
    document.documentElement.classList.add("pp-demo-activa");
    const name = storage.get(NAME_KEY);
    renderClientPreview(); decorateHome();
    if (name) applyName(name); else askName();
    new MutationObserver(fixLabels).observe(document.body, { childList: true, subtree: true });
  }
  if (window.__authDecidida) startDemo(); else document.addEventListener("auth-decidida", startDemo);

  // ------------------------------------------------------------ estilos
  const style = document.createElement("style");
  style.textContent = `
  html.pp-demo-activa body aside#sidebar#sidebar,html.pp-demo-activa #chatLauncher,html.pp-demo-activa .suggestions-launcher{display:none!important}
  html.pp-demo-activa .document-preview-shell{z-index:3200!important}
  .pp-demo-modal{position:fixed;inset:0;z-index:5000;display:grid;place-items:center;padding:18px;background:rgba(7,33,61,.72);backdrop-filter:blur(6px);font-family:Inter,ui-sans-serif,-apple-system,"Segoe UI",sans-serif}
  .pp-demo-card{width:min(440px,100%);background:#fbf8f3;border-radius:22px;padding:30px 28px 24px;box-shadow:0 30px 80px rgba(0,0,0,.35);border-top:5px solid #d2b48c;display:flex;flex-direction:column;gap:12px;color:#07213d}
  .pp-demo-card img{width:190px;margin:0 auto 6px}
  .pp-demo-eyebrow{margin:0;font-size:11px;font-weight:800;letter-spacing:.16em;color:#8a6a3e}
  .pp-demo-card h2{margin:0;font-size:24px;line-height:1.2}
  .pp-demo-card p{margin:0;color:#3b4a5c;line-height:1.5;font-size:14px}
  .pp-demo-card label{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:700;color:#07213d;margin-top:4px}
  .pp-demo-card input{height:48px;border:1px solid #d9ccb6;border-radius:12px;padding:0 14px;font:16px inherit;background:#fff;color:#07213d}
  .pp-demo-card input:focus{outline:2px solid #d2b48c;border-color:#d2b48c}
  .pp-demo-card button{height:48px;border:0;border-radius:12px;background:#07213d;color:#fff;font:700 15px inherit;cursor:pointer}
  .pp-demo-card .pp-demo-secondary{background:#d2b48c;color:#07213d}
  .pp-demo-card .pp-demo-link{background:transparent;color:#3b4a5c;height:36px}
  .pp-demo-card small{color:#7b8794;font-size:12px;line-height:1.4;text-align:center}
  .pp-demo-ribbon{position:fixed;left:16px;bottom:16px;z-index:2950;display:flex;align-items:center;gap:8px;max-width:calc(100vw - 32px);padding:8px 14px 8px 8px;border:0;border-radius:999px;background:#07213d;color:#fff;box-shadow:0 10px 26px rgba(7,33,61,.3);font:600 13px Inter,ui-sans-serif,sans-serif;cursor:pointer}
  .pp-demo-ribbon b{background:#d2b48c;color:#07213d;border-radius:999px;padding:3px 9px;font-size:11px;letter-spacing:.1em}
  .pp-demo-ribbon span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  @media(max-width:760px){.pp-demo-ribbon{left:50%;transform:translateX(-50%);bottom:calc(env(safe-area-inset-bottom,0px) + 96px);padding:5px 12px 5px 5px;font-size:12px}}
  .pp-demo-clickable{cursor:pointer}.pp-demo-clickable:hover strong{text-decoration:underline}
  .pp-demo-section{margin-top:26px}.pp-demo-section .client-fiscal-file-list{margin-top:0}.pp-demo-section h3{margin:0 0 10px;font-size:16px;color:#07213d}
  .pp-demo-list{display:flex!important;flex-direction:column;gap:8px;margin-top:8px}
  .pp-demo-list .client-document-row{display:flex!important;justify-content:flex-start!important;align-items:center;gap:14px;width:100%;padding:12px 16px;border:1px solid #ece3d6;border-radius:14px;background:#fff;text-align:left;cursor:pointer;font:inherit;color:#07213d}
  .pp-demo-list .client-document-row>span{flex:1;text-align:left;align-items:flex-start;display:flex;flex-direction:column;gap:2px}
  .pp-demo-list .client-document-row small{color:#7b8794}
  .pp-demo-list .client-document-row b{color:#8a6a3e;font-size:13px}`;
  document.head.appendChild(style);
})();
