/* La Calderera · Gestión de la casa rural */
"use strict";
const estado = { usuario: null, ajustes: null, vista: "inicio", parametro: "", pestana: "resumen", huellaDatos: "", version: null };
const app = document.getElementById("app");

/* ---------- Utilidades ---------- */
const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const euros = value => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(Number(value) || 0);
const horas = value => `${new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(Number(value) || 0)} h`;
const hoy = () => new Date().toISOString().slice(0, 10);
const esAdmin = () => estado.usuario?.role === "admin";
function fecha(iso, opciones = { day: "numeric", month: "short", year: "numeric" }) {
  if (!iso) return "—";
  return new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("es-ES", opciones);
}
function fechaHora(iso) { return iso ? new Date(iso).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""; }
async function api(url, opciones = {}) {
  const respuesta = await fetch(url, { ...opciones, headers: { ...(opciones.body && !(opciones.body instanceof Blob) ? { "Content-Type": "application/json" } : {}), ...(opciones.headers || {}) } });
  const datos = await respuesta.json().catch(() => ({}));
  if (respuesta.status === 401 && !url.startsWith("/api/auth/")) { estado.usuario = null;pintarAcceso();throw new Error(datos.error || "La sesión ha caducado."); }
  if (!respuesta.ok) throw new Error(datos.error || "No se pudo completar la operación.");
  return datos;
}
const enviar = (url, metodo, cuerpo) => api(url, { method: metodo, body: JSON.stringify(cuerpo || {}) });
function aviso(texto) {
  document.querySelector(".toast")?.remove();
  const nodo = document.createElement("div");nodo.className = "toast";nodo.textContent = texto;
  document.body.appendChild(nodo);setTimeout(() => nodo.remove(), 3200);
}
function datosFormulario(form) {
  const datos = Object.fromEntries(new FormData(form));
  form.querySelectorAll("input[type=checkbox][name]").forEach(c => { datos[c.name] = c.checked; });
  return datos;
}
const iconos = {
  inicio: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.8V21h14V9.8"/><path d="M9 21v-6h6v6"/>',
  reservas: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h3v3H8z"/>',
  limpiezas: '<path d="M14 3 9 13"/><path d="M5 21l2-8h8l2 8z"/><path d="M9 17v4M13 17v4"/>',
  incidencias: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>',
  reparaciones: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z"/>',
  ajustes: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2.8-2.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2.8-2.8.1.1a1.7 1.7 0 0 0 1.9.3h0a1.7 1.7 0 0 0 1-1.5V3h4v.2a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.9-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.5 1h.2v4h-.2a1.7 1.7 0 0 0-1.5 1Z"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
  sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>'
};
const icono = nombre => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconos[nombre]}</svg>`;

/* ---------- Ventana modal ---------- */
function modal(html, { alAbrir } = {}) {
  cerrarModal();
  const fondo = document.createElement("div");fondo.className = "modal-fondo";
  fondo.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
  fondo.addEventListener("click", e => { if (e.target === fondo || e.target.closest("[data-cerrar]")) cerrarModal(); });
  document.body.appendChild(fondo);
  alAbrir?.(fondo.querySelector(".modal"));
  fondo.querySelector("input,select,textarea")?.focus({ preventScroll: true });
  return fondo.querySelector(".modal");
}
function cerrarModal() { document.querySelector(".modal-fondo")?.remove(); }
function confirmar(texto) { return window.confirm(texto); }

/* ---------- Acceso ---------- */
async function iniciar() {
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  try {
    const { user, needsSetup } = await api("/api/auth/status");
    if (needsSetup) return pintarPrimerUso();
    if (!user) return pintarAcceso();
    estado.usuario = user;
    await entrar();
  } catch { app.innerHTML = '<div class="acceso"><div class="caja"><img src="/logo.png" alt="La Calderera"><p>No se puede conectar con el servidor. Comprueba la conexión.</p><button class="boton" onclick="location.reload()" style="width:100%">Reintentar</button></div></div>'; }
}
function pintarAcceso() {
  cerrarModal();
  app.innerHTML = `<div class="acceso"><div class="caja">
    <img src="/logo.png?v=1" alt="La Calderera · Tu naturaleza">
    <h1>Gestión de la casa rural</h1><p>Entra con tu usuario</p>
    <form id="form-acceso">
      <div class="campo"><label for="usuario">Usuario</label><input id="usuario" name="username" autocomplete="username" autocapitalize="none" required></div>
      <div class="campo"><label for="clave">Contraseña</label><input id="clave" name="password" type="password" autocomplete="current-password" required></div>
      <div class="error" id="error-acceso"></div>
      <button class="boton" type="submit">Entrar</button>
    </form></div></div>`;
  document.getElementById("form-acceso").onsubmit = async event => {
    event.preventDefault();
    try { estado.usuario = (await enviar("/api/auth/login", "POST", datosFormulario(event.target))).user;await entrar(); }
    catch (error) { document.getElementById("error-acceso").textContent = error.message; }
  };
}
function pintarPrimerUso() {
  app.innerHTML = `<div class="acceso"><div class="caja">
    <img src="/logo.png?v=1" alt="La Calderera · Tu naturaleza">
    <h1>Bienvenido a La Calderera</h1><p>Crea la cuenta del administrador</p>
    <form id="form-alta">
      <div class="campo"><label>Nombre</label><input name="name" required autocomplete="name"></div>
      <div class="campo"><label>Usuario de acceso</label><input name="username" required autocapitalize="none" autocomplete="username"></div>
      <div class="campo"><label>Contraseña (mínimo 6 caracteres)</label><input name="password" type="password" minlength="6" required autocomplete="new-password"></div>
      <div class="error" id="error-alta"></div>
      <button class="boton" type="submit">Crear y entrar</button>
    </form></div></div>`;
  document.getElementById("form-alta").onsubmit = async event => {
    event.preventDefault();
    try { estado.usuario = (await enviar("/api/auth/setup", "POST", datosFormulario(event.target))).user;await entrar(); }
    catch (error) { document.getElementById("error-alta").textContent = error.message; }
  };
}
async function entrar() {
  estado.ajustes = await api("/api/ajustes");
  leerRuta();
  await pintar();
}
async function salir() {
  await enviar("/api/auth/logout", "POST").catch(() => {});
  estado.usuario = null;location.hash = "";pintarAcceso();
}

/* ---------- Navegación ---------- */
function secciones() {
  const lista = [["inicio", "Inicio"], ["reservas", "Reservas"], ["limpiezas", esAdmin() ? "Limpiezas" : "Mis horas"]];
  if (esAdmin()) lista.push(["incidencias", "Incidencias"], ["reparaciones", "Reparaciones"]);
  lista.push(["ajustes", esAdmin() ? "Ajustes" : "Mi cuenta"]);
  return lista;
}
function leerRuta() {
  const [vista, parametro] = location.hash.replace(/^#\/?/, "").split("/");
  estado.vista = secciones().some(([id]) => id === vista) || vista === "reserva" ? vista : "inicio";
  estado.parametro = decodeURIComponent(parametro || "");
}
function ir(ruta) { if (location.hash === `#/${ruta}`) pintar();else location.hash = `/${ruta}`; }
window.addEventListener("hashchange", () => { if (!estado.usuario) return;leerRuta();if (estado.vista !== "reserva") estado.pestana = "resumen";pintar(); });

function marco(contenido) {
  const activa = estado.vista === "reserva" ? "reservas" : estado.vista;
  const botones = secciones().map(([id, texto]) => `<button class="nav-boton ${id === activa ? "activo" : ""}" data-ir="${id}">${icono(id)}<span>${texto}</span></button>`).join("");
  return `<div class="app">
    <aside class="lateral"><div class="marca"><img src="/logo-blanco.png?v=1" alt="La Calderera · Tu naturaleza"></div><nav>${botones}</nav>
      <div class="usuario"><strong>${esc(estado.usuario.name)}</strong><small>${esAdmin() ? "Administrador" : "Trabajador"}</small></div></aside>
    <div><header class="cabecera-movil"><img src="/logo-blanco.png?v=1" alt="La Calderera"><button data-ir="ajustes">${esc(estado.usuario.name.split(" ")[0])}</button></header>
      <main class="principal" id="contenido">${contenido}</main></div>
    <nav class="barra-inferior">${botones}</nav></div>`;
}
let pintando = 0;
async function pintar({ silencioso = false } = {}) {
  const turno = ++pintando;
  if (!silencioso && !document.getElementById("contenido")) app.innerHTML = marco('<p class="vacio">Cargando…</p>');
  let html;
  try { html = await (vistas[estado.vista] || vistas.inicio)(); }
  catch (error) { html = `<div class="aviso">${esc(error.message)}</div>`; }
  if (turno !== pintando || !estado.usuario) return;
  const scroll = window.scrollY;
  app.innerHTML = marco(html);
  app.querySelectorAll("[data-ir]").forEach(b => b.onclick = () => ir(b.dataset.ir));
  enlazar[estado.vista]?.();
  if (silencioso) window.scrollTo(0, scroll);
}

/* ---------- Componentes ---------- */
function filaReserva(r) {
  const entrada = new Date(`${r.checkIn}T12:00:00`);
  const titulo = esAdmin() ? esc(r.guestName || "Sin nombre") : `Reserva de ${r.nights} noche${r.nights === 1 ? "" : "s"}`;
  const estadoRevision = fase => r.inspections?.[fase] === "completada" ? `<span class="etiqueta">${fase === "previa" ? "Previa" : "Posterior"} ✓</span>` : "";
  return `<button class="fila" data-reserva="${r.id}">
    <span class="fecha"><b>${entrada.getDate()}</b><span>${entrada.toLocaleDateString("es-ES", { month: "short" })}</span></span>
    <span class="cuerpo"><strong>${titulo}</strong>
      <small>${fecha(r.checkIn, { day: "numeric", month: "short" })} → ${fecha(r.checkOut, { day: "numeric", month: "short" })} · ${r.nights} noche${r.nights === 1 ? "" : "s"} · ${r.guests || "?"} persona${r.guests === 1 ? "" : "s"}${esAdmin() && r.channel ? ` · ${esc(r.channel)}` : ""}</small></span>
    <span class="lado">${esAdmin() ? `<span class="importe">${euros(r.amount)}</span>` : ""}
      <span class="acciones">${r.status === "cancelada" ? '<span class="etiqueta rojo">Cancelada</span>' : ""}${r.cleaningHours ? `<span class="etiqueta azul">${horas(r.cleaningHours)}</span>` : ""}${estadoRevision("previa")}${estadoRevision("posterior")}${r.openIncidents ? `<span class="etiqueta rojo">${r.openIncidents} incid.</span>` : ""}</span></span>
  </button>`;
}
function bloqueAdjuntos(tipo, id, adjuntos, { puedeEditar = true, texto = "Adjuntar foto o documento" } = {}) {
  const items = (adjuntos || []).map(a => {
    const url = `/api/adjuntos/${a.id}`, imagen = /^image\//.test(a.type);
    const ext = (a.name.split(".").pop() || "DOC").slice(0, 4).toUpperCase();
    return `<div class="adjunto"><a href="${url}" target="_blank" rel="noopener" title="${esc(a.name)}">${imagen ? `<img class="miniatura" src="${url}" alt="" loading="lazy">` : `<span class="miniatura">${esc(ext)}</span>`}<span class="nombre">${esc(a.name)}</span></a>${puedeEditar ? `<button class="quitar" data-quitar-adjunto="${a.id}" title="Quitar">×</button>` : ""}</div>`;
  }).join("");
  return `<div class="adjuntos">${items}</div>${puedeEditar ? `<label class="subir boton secundario pequeno" style="margin-top:10px">${icono("clip")} ${texto}<input type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.odt,.txt" data-subir="${tipo}" data-id="${id}"></label>` : ""}`;
}
// Las fotos del móvil se reducen antes de subirlas para que vayan rápido
async function prepararArchivo(archivo) {
  if (!/^image\/(jpeg|png|webp|heic|heif)/i.test(archivo.type) || archivo.size < 1.2 * 1024 * 1024) return archivo;
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, 2000 / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement("canvas");lienzo.width = Math.round(imagen.width * escala);lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    const blob = await new Promise(r => lienzo.toBlob(r, "image/jpeg", .85));
    return blob ? new File([blob], archivo.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : archivo;
  } catch { return archivo; }
}
function enlazarAdjuntos(alTerminar = () => pintar({ silencioso: true })) {
  document.querySelectorAll("[data-subir]").forEach(input => input.onchange = async () => {
    const archivos = [...input.files];if (!archivos.length) return;
    aviso(`Subiendo ${archivos.length} archivo${archivos.length === 1 ? "" : "s"}…`);
    try {
      for (const original of archivos) {
        const archivo = await prepararArchivo(original);
        await api(`/api/adjuntos/${input.dataset.subir}/${input.dataset.id}`, { method: "POST", body: archivo, headers: { "Content-Type": archivo.type || "application/octet-stream", "X-File-Name": encodeURIComponent(archivo.name) } });
      }
      aviso("Archivos guardados");
    } catch (error) { aviso(error.message); }
    alTerminar();
  });
  document.querySelectorAll("[data-quitar-adjunto]").forEach(b => b.onclick = async event => {
    event.preventDefault();
    if (!confirmar("¿Quitar este archivo?")) return;
    try { await api(`/api/adjuntos/${b.dataset.quitarAdjunto}`, { method: "DELETE" });aviso("Archivo quitado"); } catch (error) { aviso(error.message); }
    alTerminar();
  });
}

/* ---------- Vistas ---------- */
const vistas = {}, enlazar = {};

vistas.inicio = async () => {
  const r = await api("/api/resumen");
  const saludo = new Date().getHours() < 14 ? "Buenos días" : new Date().getHours() < 21 ? "Buenas tardes" : "Buenas noches";
  const datos = esAdmin() ? `
    <div class="dato"><small>Reservas ${new Date().getFullYear()}</small><strong>${r.yearReservations}</strong></div>
    <div class="dato"><small>Ingresos ${new Date().getFullYear()}</small><strong>${euros(r.yearIncome)}</strong></div>
    <div class="dato"><small>Limpieza pendiente de pagar</small><strong>${euros(r.unpaidTotal)}</strong><span class="suave">${horas(r.unpaidHours)}</span></div>
    <div class="dato"><small>Incidencias abiertas</small><strong style="color:${r.openIncidents ? "var(--rojo)" : ""}">${r.openIncidents}</strong></div>
    <div class="dato"><small>Reparaciones pendientes</small><strong>${r.pendingRepairs}</strong></div>` : `
    <div class="dato"><small>Horas pendientes de cobrar</small><strong>${horas(r.unpaidHours)}</strong></div>
    <div class="dato"><small>Te corresponde</small><strong>${euros(r.unpaidTotal)}</strong><span class="suave">a ${euros(r.hourlyRate)} la hora</span></div>`;
  return `<div class="titulo"><div><h1>${saludo}, ${esc(estado.usuario.name.split(" ")[0])}</h1><p>${fecha(hoy(), { weekday: "long", day: "numeric", month: "long" })}</p></div>
    ${esAdmin() ? `<div class="acciones"><button class="boton" data-nueva-reserva>${icono("mas")} Nueva reserva</button></div>` : `<div class="acciones"><button class="boton" data-ir="limpiezas">${icono("mas")} Añadir horas</button></div>`}</div>
    <div class="rejilla">${datos}</div>
    <div class="tarjeta" style="margin-top:18px"><h2>Próximas reservas</h2>
      <div class="lista">${r.upcoming.length ? r.upcoming.map(x => filaReserva({ ...x, cleaningHours: 0 })).join("") : '<p class="vacio">No hay reservas próximas.</p>'}</div></div>`;
};
enlazar.inicio = () => {
  document.querySelectorAll("[data-reserva]").forEach(b => b.onclick = () => ir(`reserva/${b.dataset.reserva}`));
  document.querySelector("[data-nueva-reserva]")?.addEventListener("click", () => formularioReserva());
};

vistas.reservas = async () => {
  const lista = await api("/api/reservas"), d = hoy();
  const proximas = lista.filter(r => r.checkOut >= d && r.status !== "cancelada");
  const pasadas = lista.filter(r => r.checkOut < d || r.status === "cancelada").reverse();
  const ava = estado.ajustes.avaibook;
  return `<div class="titulo"><div><h1>Reservas</h1><p>${esAdmin() ? "Reservas de Avaibook, Booking, Airbnb y directas" : "Fechas y número de personas de cada estancia"}</p></div>
    ${esAdmin() ? `<div class="acciones">${ava?.configured ? `<button class="boton secundario" data-sincronizar>${icono("sync")} Sincronizar Avaibook</button>` : ""}<button class="boton" data-nueva-reserva>${icono("mas")} Nueva reserva</button></div>` : ""}</div>
    ${esAdmin() && ava?.configured && ava.lastSync ? `<p class="suave" style="margin-top:-8px">Última sincronización con Avaibook: ${fechaHora(ava.lastSync)}${ava.lastError ? ` · <span style="color:var(--rojo)">${esc(ava.lastError)}</span>` : ""}</p>` : ""}
    <div class="grupo-titulo">Próximas y en curso (${proximas.length})</div>
    <div class="lista">${proximas.map(filaReserva).join("") || '<p class="vacio">No hay reservas próximas.</p>'}</div>
    ${pasadas.length ? `<div class="grupo-titulo">Anteriores</div><div class="lista">${pasadas.slice(0, 60).map(filaReserva).join("")}</div>` : ""}`;
};
enlazar.reservas = () => {
  enlazar.inicio();
  document.querySelector("[data-sincronizar]")?.addEventListener("click", async event => {
    event.target.disabled = true;
    try { const r = await enviar("/api/avaibook/sincronizar", "POST");aviso(r.imported ? `${r.imported} reservas nuevas importadas` : "Reservas al día");estado.ajustes = await api("/api/ajustes"); }
    catch (error) { aviso(error.message); }
    pintar({ silencioso: true });
  });
};

function formularioReserva(r = {}) {
  const canales = ["Avaibook", "Booking", "Airbnb", "Directa", "Otro"];
  const m = modal(`<h2>${r.id ? "Editar reserva" : "Nueva reserva"}</h2>
    <form class="formulario" id="form-reserva">
      <div class="campo"><label>Entrada</label><input type="date" name="checkIn" value="${esc(r.checkIn || "")}" required></div>
      <div class="campo"><label>Salida</label><input type="date" name="checkOut" value="${esc(r.checkOut || "")}" required></div>
      <div class="campo"><label>Adultos</label><input type="number" name="adults" min="0" max="99" value="${esc(r.adults ?? r.guests ?? 2)}"></div>
      <div class="campo"><label>Niños</label><input type="number" name="children" min="0" max="99" value="${esc(r.children ?? 0)}"></div>
      <div class="campo ancho"><label>Nombre del huésped</label><input name="guestName" value="${esc(r.guestName || "")}"></div>
      <div class="campo"><label>Teléfono</label><input name="phone" type="tel" value="${esc(r.phone || "")}"></div>
      <div class="campo"><label>Correo</label><input name="email" type="email" value="${esc(r.email || "")}"></div>
      <div class="campo"><label>Importe (€)</label><input name="amount" inputmode="decimal" value="${esc(r.amount ?? "")}"></div>
      <div class="campo"><label>Canal</label><select name="channel">${canales.map(c => `<option ${c === (r.channel || "Directa") ? "selected" : ""}>${c}</option>`).join("")}</select></div>
      <div class="campo"><label>Estado</label><select name="status">${["confirmada", "pendiente", "cancelada", "finalizada"].map(s => `<option value="${s}" ${s === (r.status || "confirmada") ? "selected" : ""}>${s[0].toUpperCase() + s.slice(1)}</option>`).join("")}</select></div>
      <div class="campo ancho"><label>Notas privadas (solo administrador)</label><textarea name="notes">${esc(r.notes || "")}</textarea></div>
      <div class="campo ancho"><label>Indicaciones para la limpieza (las ve el trabajador)</label><textarea name="cleaningNotes" placeholder="Ej.: cuna en el dormitorio 2, llegada temprana…">${esc(r.cleaningNotes || "")}</textarea></div>
      <div class="error ancho campo" id="error-reserva"></div>
    </form>
    <div class="pie">${r.id ? '<button class="boton peligro" data-borrar style="margin-right:auto">Eliminar</button>' : ""}<button class="boton secundario" data-cerrar>Cancelar</button><button class="boton" data-guardar>Guardar</button></div>`);
  m.querySelector("[data-guardar]").onclick = async () => {
    const form = m.querySelector("form");if (!form.reportValidity()) return;
    const datos = datosFormulario(form);datos.guests = Number(datos.adults || 0) + Number(datos.children || 0);
    try {
      const guardada = await enviar(r.id ? `/api/reservas/${r.id}` : "/api/reservas", r.id ? "PUT" : "POST", datos);
      cerrarModal();aviso("Reserva guardada");
      if (!r.id) ir(`reserva/${guardada.id}`);else pintar({ silencioso: true });
    } catch (error) { m.querySelector("#error-reserva").textContent = error.message; }
  };
  m.querySelector("[data-borrar]")?.addEventListener("click", async () => {
    if (!confirmar("¿Eliminar esta reserva? Se borrarán también sus revisiones.")) return;
    await api(`/api/reservas/${r.id}`, { method: "DELETE" });cerrarModal();aviso("Reserva eliminada");ir("reservas");
  });
}

/* Detalle de una reserva */
let detalleActual = null;
vistas.reserva = async () => {
  const d = detalleActual = await api(`/api/reservas/${encodeURIComponent(estado.parametro)}`);
  const r = d.reservation;
  const pestanas = [["resumen", "Resumen"], ["limpieza", "Limpieza"]];
  if (d.inspections) pestanas.push(["previa", "Estado previo"], ["posterior", "Estado posterior"], ["incidencias", `Incidencias${d.incidents.length ? ` (${d.incidents.length})` : ""}`]);
  if (!pestanas.some(([id]) => id === estado.pestana)) estado.pestana = "resumen";
  const cabecera = `<div class="titulo"><div><button class="boton secundario pequeno" data-ir="reservas" style="margin-bottom:10px">← Reservas</button>
      <h1>${esAdmin() ? esc(r.guestName || "Reserva") : "Reserva"}</h1><p>${fecha(r.checkIn, { weekday: "long", day: "numeric", month: "long" })} → ${fecha(r.checkOut, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p></div>
      ${esAdmin() ? '<div class="acciones"><button class="boton secundario" data-editar-reserva>Editar</button></div>' : ""}</div>
    <div class="pestanas">${pestanas.map(([id, texto]) => `<button class="pestana ${id === estado.pestana ? "activa" : ""}" data-pestana="${id}">${texto}</button>`).join("")}</div>`;
  return cabecera + (paneles[estado.pestana] || paneles.resumen)(d);
};
const paneles = {};
paneles.resumen = ({ reservation: r, cleanings, inspections, incidents }) => {
  const totalHoras = cleanings.reduce((s, c) => s + c.hours, 0), totalLimpieza = cleanings.reduce((s, c) => s + c.total, 0);
  const estadoFase = fase => !inspections ? "" : inspections[fase].completed ? '<span class="etiqueta">Completada</span>' : inspections[fase].updatedAt ? '<span class="etiqueta ambar">En curso</span>' : '<span class="etiqueta gris">Sin hacer</span>';
  return `<div class="rejilla">
      <div class="dato"><small>Noches</small><strong>${r.nights}</strong></div>
      <div class="dato"><small>Personas</small><strong>${r.guests || "—"}</strong><span class="suave">${r.adults || 0} adultos${r.children ? ` · ${r.children} niños` : ""}</span></div>
      ${esAdmin() ? `<div class="dato"><small>Importe</small><strong>${euros(r.amount)}</strong><span class="suave">${esc(r.channel || "")}</span></div>` : ""}
      <div class="dato"><small>Limpieza</small><strong>${horas(totalHoras)}</strong><span class="suave">${euros(totalLimpieza)}</span></div>
    </div>
    ${r.cleaningNotes ? `<div class="tarjeta" style="margin-top:14px"><h2>Indicaciones para la limpieza</h2><p style="margin:0;white-space:pre-wrap">${esc(r.cleaningNotes)}</p></div>` : ""}
    ${esAdmin() ? `<div class="tarjeta"><h2>Datos del huésped</h2>
      <p style="margin:0">${esc(r.guestName || "—")}${r.phone ? ` · <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>` : ""}${r.email ? ` · <a href="mailto:${esc(r.email)}">${esc(r.email)}</a>` : ""}</p>
      <p class="suave" style="margin:8px 0 0">Estado: ${esc(r.status)}${r.externalId ? " · Importada de Avaibook" : ""}</p>
      ${r.notes ? `<p style="white-space:pre-wrap;margin:10px 0 0">${esc(r.notes)}</p>` : ""}</div>` : ""}
    ${inspections ? `<div class="tarjeta"><h2>Revisiones</h2>
      <div class="lista"><button class="fila" data-pestana="previa"><span class="cuerpo"><strong>Estado previo a la reserva</strong><small>Comprobación antes de la llegada</small></span><span class="lado">${estadoFase("previa")}</span></button>
      <button class="fila" data-pestana="posterior"><span class="cuerpo"><strong>Estado posterior a la reserva</strong><small>Comprobación tras la salida</small></span><span class="lado">${estadoFase("posterior")}</span></button>
      <button class="fila" data-pestana="incidencias"><span class="cuerpo"><strong>Incidencias</strong><small>Roturas y problemas detectados</small></span><span class="lado">${incidents.filter(i => i.status !== "resuelta").length ? `<span class="etiqueta rojo">${incidents.filter(i => i.status !== "resuelta").length} abiertas</span>` : `<span class="etiqueta gris">${incidents.length}</span>`}</span></button></div></div>` : ""}`;
};
paneles.limpieza = ({ reservation: r, cleanings }) => {
  const tarifa = estado.ajustes.hourlyRate;
  const lista = cleanings.map(c => `<div class="tarjeta">
      <div class="titulo" style="margin-bottom:6px"><div><h3>${fecha(c.date, { weekday: "long", day: "numeric", month: "long" })}${c.startTime ? ` · ${esc(c.startTime)}` : ""}</h3>
        <p>${esAdmin() ? `${esc(c.workerName)} · ` : ""}${horas(c.hours)} × ${euros(c.rate)} = <span class="importe">${euros(c.total)}</span></p></div>
        <div class="acciones">${c.paid ? '<span class="etiqueta">Pagada</span>' : '<span class="etiqueta ambar">Pendiente de pago</span>'}
          ${esAdmin() || !c.paid ? `<button class="boton secundario pequeno" data-editar-limpieza="${c.id}">Editar</button>` : ""}</div></div>
      ${c.notes ? `<p style="margin:6px 0;white-space:pre-wrap">${esc(c.notes)}</p>` : ""}
      ${bloqueAdjuntos("limpieza", c.id, c.attachments, { puedeEditar: esAdmin() || !c.paid })}</div>`).join("");
  return `<div class="tarjeta"><h2>Añadir horas de limpieza</h2>
      <form class="formulario" id="form-limpieza">
        <div class="campo"><label>Fecha</label><input type="date" name="date" value="${hoy()}" required></div>
        <div class="campo"><label>Hora de inicio</label><input type="time" name="startTime"></div>
        <div class="campo"><label>Horas</label><input name="hours" inputmode="decimal" placeholder="Ej.: 3,5" required></div>
        ${esAdmin() ? `<div class="campo"><label>Trabajador</label><select name="workerId" id="sel-trabajador"></select></div>` : ""}
        <div class="campo ancho"><label>Observaciones</label><textarea name="notes" placeholder="Opcional"></textarea></div>
        <div class="campo ancho"><div class="calculo"><span>A pagar (${euros(tarifa)}/hora)</span><strong id="calculo">${euros(0)}</strong></div></div>
        <div class="campo ancho"><button class="boton" type="submit">Guardar horas</button></div>
      </form><p class="suave" style="margin:10px 0 0">Después de guardar podrás adjuntar fotos o documentos.</p></div>
    <div class="grupo-titulo">Limpiezas de esta reserva</div>${lista || '<p class="vacio">Todavía no hay horas registradas.</p>'}`;
};
function panelRevision(fase) {
  return ({ inspections }) => {
    const insp = inspections[fase], hechos = insp.items.filter(i => i.status).length, mal = insp.items.filter(i => i.status === "mal").length;
    const items = insp.items.map((item, i) => `<div class="check" data-indice="${i}"><div class="texto">${esc(item.text)}${item.status === "mal" ? `<small>${esc(item.note || "Marcado con problema")}</small>` : ""}</div>
      <div class="check-botones"><button class="ok ${item.status === "ok" ? "activo" : ""}" data-marcar="ok" title="Bien" aria-label="Bien">✓</button><button class="mal ${item.status === "mal" ? "activo" : ""}" data-marcar="mal" title="Problema" aria-label="Problema">✕</button></div></div>`).join("");
    return `<div class="tarjeta"><div class="titulo" style="margin-bottom:6px"><div><h2>${fase === "previa" ? "Estado previo a la reserva" : "Estado posterior a la reserva"}</h2>
        <p>${hechos} de ${insp.items.length} revisados${mal ? ` · <span style="color:var(--rojo);font-weight:700">${mal} con problema</span>` : ""}${insp.updatedAt ? ` · ${esc(insp.updatedByName || "")} ${fechaHora(insp.updatedAt)}` : ""}</p></div>
        ${insp.completed ? '<span class="etiqueta">Completada</span>' : ""}</div>
      <div class="progreso"><span style="width:${insp.items.length ? Math.round(hechos / insp.items.length * 100) : 0}%"></span></div>
      <div id="lista-revision">${items}</div>
      <div class="formulario" style="margin-top:14px"><div class="campo ancho"><label>Observaciones</label><textarea id="notas-revision">${esc(insp.notes || "")}</textarea></div></div>
      <div class="acciones" style="margin-top:14px"><button class="boton" data-guardar-revision="${fase}">${insp.completed ? "Guardar cambios" : "Marcar como completada"}</button>
        <button class="boton secundario" data-guardar-revision="${fase}" data-borrador>Guardar sin completar</button>
        <button class="boton peligro" data-nueva-incidencia="${fase}">Añadir incidencia</button></div></div>`;
  };
}
paneles.previa = panelRevision("previa");
paneles.posterior = panelRevision("posterior");
paneles.incidencias = ({ incidents }) => `<div class="titulo"><div><h2>Incidencias de esta reserva</h2><p>Roturas, desperfectos o cualquier problema detectado</p></div>
    <button class="boton" data-nueva-incidencia="posterior">${icono("mas")} Nueva incidencia</button></div>
  ${incidents.map(tarjetaIncidencia).join("") || '<p class="vacio">Sin incidencias. ¡Todo en orden!</p>'}`;
function tarjetaIncidencia(i) {
  const color = { leve: "azul", media: "ambar", grave: "rojo" }[i.severity];
  return `<div class="tarjeta"><div class="titulo" style="margin-bottom:6px"><div><h3>${esc(i.item || "Incidencia")}</h3>
      <p>${i.phase === "previa" ? "Estado previo" : "Estado posterior"} · ${esc(i.createdByName || "")} · ${fechaHora(i.createdAt)}${i.reservation && esAdmin() ? ` · Reserva ${fecha(i.reservation.checkIn, { day: "numeric", month: "short" })}${i.reservation.guestName ? ` (${esc(i.reservation.guestName)})` : ""}` : ""}</p></div>
      <div class="acciones"><span class="etiqueta ${color}">${i.severity}</span>${i.status === "resuelta" ? '<span class="etiqueta">Resuelta</span>' : '<span class="etiqueta rojo">Abierta</span>'}</div></div>
    <p style="margin:6px 0;white-space:pre-wrap">${esc(i.description)}</p>
    ${i.cost && esAdmin() ? `<p class="suave" style="margin:4px 0">Coste estimado: <span class="importe">${euros(i.cost)}</span></p>` : ""}
    ${i.resolution ? `<p class="suave" style="margin:4px 0">Solución: ${esc(i.resolution)}</p>` : ""}
    ${bloqueAdjuntos("incidencia", i.id, i.attachments, { texto: "Adjuntar foto" })}
    ${esAdmin() ? `<div class="acciones" style="margin-top:12px">
      <button class="boton secundario pequeno" data-resolver="${i.id}" data-estado="${i.status === "resuelta" ? "abierta" : "resuelta"}">${i.status === "resuelta" ? "Reabrir" : "Marcar resuelta"}</button>
      <button class="boton secundario pequeno" data-a-reparacion="${i.id}">${icono("reparaciones")} Pasar a reparaciones</button>
      ${i.reservationId && estado.vista === "incidencias" ? `<button class="boton secundario pequeno" data-ver-reserva="${i.reservationId}">Ver reserva</button>` : ""}
      <button class="boton peligro pequeno" data-borrar-incidencia="${i.id}">Eliminar</button></div>` : ""}</div>`;
}
function enlazarIncidencias() {
  document.querySelectorAll("[data-resolver]").forEach(b => b.onclick = async () => {
    const datos = { status: b.dataset.estado };
    if (b.dataset.estado === "resuelta") { const solucion = prompt("¿Cómo se ha resuelto? (opcional)");if (solucion === null) return;datos.resolution = solucion; }
    try { await enviar(`/api/incidencias/${b.dataset.resolver}`, "PUT", datos);aviso("Incidencia actualizada"); } catch (error) { aviso(error.message); }
    pintar({ silencioso: true });
  });
  document.querySelectorAll("[data-a-reparacion]").forEach(b => b.onclick = async () => {
    try { await enviar(`/api/incidencias/${b.dataset.aReparacion}/reparacion`, "POST");aviso("Añadida a la lista de reparaciones"); } catch (error) { aviso(error.message); }
  });
  document.querySelectorAll("[data-borrar-incidencia]").forEach(b => b.onclick = async () => {
    if (!confirmar("¿Eliminar esta incidencia?")) return;
    await api(`/api/incidencias/${b.dataset.borrarIncidencia}`, { method: "DELETE" }).catch(e => aviso(e.message));pintar({ silencioso: true });
  });
  document.querySelectorAll("[data-ver-reserva]").forEach(b => b.onclick = () => { estado.pestana = "incidencias";ir(`reserva/${b.dataset.verReserva}`); });
}
function formularioIncidencia(fase, item = "") {
  const opciones = detalleActual.inspections[fase].items.map(i => i.text);
  const m = modal(`<h2>Nueva incidencia</h2>
    <form class="formulario">
      <div class="campo ancho"><label>¿Qué está mal?</label><input name="item" list="lista-items" value="${esc(item)}" placeholder="Ej.: Cristal del salón"><datalist id="lista-items">${opciones.map(o => `<option value="${esc(o)}">`).join("")}</datalist></div>
      <div class="campo ancho"><label>Descripción</label><textarea name="description" required placeholder="Qué ha pasado, qué se ha roto…"></textarea></div>
      <div class="campo"><label>Gravedad</label><select name="severity"><option value="leve">Leve</option><option value="media" selected>Media</option><option value="grave">Grave</option></select></div>
      <div class="campo"><label>Momento</label><select name="phase"><option value="previa" ${fase === "previa" ? "selected" : ""}>Estado previo</option><option value="posterior" ${fase !== "previa" ? "selected" : ""}>Estado posterior</option></select></div>
      ${esAdmin() ? '<div class="campo"><label>Coste estimado (€)</label><input name="cost" inputmode="decimal"></div>' : ""}
      <div class="campo ancho"><label>Fotos</label><input type="file" name="fotos" multiple accept="image/*,application/pdf"></div>
      <div class="campo ancho error" id="error-incidencia"></div>
    </form><div class="pie"><button class="boton secundario" data-cerrar>Cancelar</button><button class="boton" data-guardar>Guardar incidencia</button></div>`);
  m.querySelector("[data-guardar]").onclick = async event => {
    const form = m.querySelector("form");if (!form.reportValidity()) return;
    event.target.disabled = true;
    try {
      const datos = Object.fromEntries(new FormData(form));delete datos.fotos;
      const incidencia = await enviar("/api/incidencias", "POST", { ...datos, reservationId: detalleActual.reservation.id });
      for (const original of form.fotos.files) {
        const archivo = await prepararArchivo(original);
        await api(`/api/adjuntos/incidencia/${incidencia.id}`, { method: "POST", body: archivo, headers: { "Content-Type": archivo.type || "application/octet-stream", "X-File-Name": encodeURIComponent(archivo.name) } });
      }
      cerrarModal();aviso("Incidencia registrada");pintar({ silencioso: true });
    } catch (error) { event.target.disabled = false;m.querySelector("#error-incidencia").textContent = error.message; }
  };
}
function formularioLimpieza(c) {
  const m = modal(`<h2>Editar limpieza</h2><form class="formulario">
      <div class="campo"><label>Fecha</label><input type="date" name="date" value="${esc(c.date)}" required></div>
      <div class="campo"><label>Hora de inicio</label><input type="time" name="startTime" value="${esc(c.startTime || "")}"></div>
      <div class="campo"><label>Horas</label><input name="hours" inputmode="decimal" value="${esc(c.hours)}" required></div>
      ${esAdmin() ? `<div class="campo"><label>€/hora</label><input name="rate" inputmode="decimal" value="${esc(c.rate)}"></div>
      <div class="campo ancho"><label class="interruptor"><input type="checkbox" name="paid" ${c.paid ? "checked" : ""}> Pagada</label></div>` : ""}
      <div class="campo ancho"><label>Observaciones</label><textarea name="notes">${esc(c.notes || "")}</textarea></div>
      <div class="campo ancho error" id="error-limpieza"></div></form>
    <div class="pie"><button class="boton peligro" data-borrar style="margin-right:auto">Eliminar</button><button class="boton secundario" data-cerrar>Cancelar</button><button class="boton" data-guardar>Guardar</button></div>`);
  m.querySelector("[data-guardar]").onclick = async () => {
    try { await enviar(`/api/limpiezas/${c.id}`, "PUT", datosFormulario(m.querySelector("form")));cerrarModal();aviso("Limpieza actualizada");pintar({ silencioso: true }); }
    catch (error) { m.querySelector("#error-limpieza").textContent = error.message; }
  };
  m.querySelector("[data-borrar]").onclick = async () => {
    if (!confirmar("¿Eliminar este registro de horas y sus archivos?")) return;
    try { await api(`/api/limpiezas/${c.id}`, { method: "DELETE" });cerrarModal();aviso("Eliminada");pintar({ silencioso: true }); } catch (error) { aviso(error.message); }
  };
}
async function rellenarTrabajadores(select, seleccionado) {
  if (!select) return;
  const usuarios = (await api("/api/usuarios")).filter(u => u.active);
  select.innerHTML = usuarios.map(u => `<option value="${u.id}" ${u.id === (seleccionado || estado.usuario.id) ? "selected" : ""}>${esc(u.name)}</option>`).join("");
}
enlazar.reserva = () => {
  const d = detalleActual;
  document.querySelectorAll("[data-pestana]").forEach(b => b.onclick = () => { estado.pestana = b.dataset.pestana;pintar({ silencioso: true });window.scrollTo(0, 0); });
  document.querySelector("[data-editar-reserva]")?.addEventListener("click", () => formularioReserva(d.reservation));
  enlazarAdjuntos();enlazarIncidencias();
  const form = document.getElementById("form-limpieza");
  if (form) {
    rellenarTrabajadores(document.getElementById("sel-trabajador"));
    const calcular = () => { document.getElementById("calculo").textContent = euros((Number(String(form.hours.value).replace(",", ".")) || 0) * estado.ajustes.hourlyRate); };
    form.hours.oninput = calcular;
    form.onsubmit = async event => {
      event.preventDefault();
      try { await enviar("/api/limpiezas", "POST", { ...datosFormulario(form), reservationId: d.reservation.id });aviso("Horas guardadas");pintar({ silencioso: true }); }
      catch (error) { aviso(error.message); }
    };
  }
  document.querySelectorAll("[data-editar-limpieza]").forEach(b => b.onclick = () => formularioLimpieza(d.cleanings.find(c => c.id === b.dataset.editarLimpieza)));
  // Revisión: marcar cada punto como bien o mal
  const fase = ["previa", "posterior"].includes(estado.pestana) ? estado.pestana : null;
  if (fase && d.inspections) {
    const insp = d.inspections[fase];
    document.querySelectorAll("#lista-revision .check").forEach(fila => fila.querySelectorAll("[data-marcar]").forEach(b => b.onclick = () => {
      const item = insp.items[Number(fila.dataset.indice)], valor = b.dataset.marcar;
      item.status = item.status === valor ? "" : valor;
      if (item.status === "mal") {
        const nota = prompt(`¿Qué problema hay en «${item.text}»?`, item.note || "");
        if (nota === null) { item.status = "";return; }
        item.note = nota;
        if (confirmar("¿Quieres registrarlo también como incidencia (para poder adjuntar fotos y seguirlo)?")) {
          guardarRevision(fase, false, true).then(() => formularioIncidencia(fase, item.text));
          return;
        }
      } else item.note = "";
      guardarRevision(fase, insp.completed, true);
    }));
    document.querySelectorAll("[data-guardar-revision]").forEach(b => b.onclick = () => guardarRevision(fase, !b.hasAttribute("data-borrador")));
  }
  document.querySelectorAll("[data-nueva-incidencia]").forEach(b => b.onclick = () => formularioIncidencia(b.dataset.nuevaIncidencia));
};
async function guardarRevision(fase, completada, silencioso = false) {
  const insp = detalleActual.inspections[fase];
  if (completada && insp.items.some(i => !i.status) && !confirmar("Hay puntos sin revisar. ¿Marcar la revisión como completada igualmente?")) return;
  try {
    const notas = document.getElementById("notas-revision")?.value ?? insp.notes;
    detalleActual.inspections[fase] = await enviar(`/api/reservas/${detalleActual.reservation.id}/revision/${fase}`, "PUT", { items: insp.items, notes: notas, completed: completada });
    if (!silencioso) aviso(completada ? "Revisión completada" : "Revisión guardada");
  } catch (error) { aviso(error.message); }
  await pintar({ silencioso: true });
}

/* Limpiezas / Mis horas */
vistas.limpiezas = async () => {
  const [limpiezas, reservas] = await Promise.all([api("/api/limpiezas"), api("/api/reservas")]);
  const reservaDe = id => reservas.find(r => r.id === id);
  const pendientes = limpiezas.filter(c => !c.paid);
  let resumen = "";
  if (esAdmin()) {
    const porTrabajador = {};
    pendientes.forEach(c => { const t = porTrabajador[c.workerId] ||= { nombre: c.workerName, horas: 0, total: 0, ids: [] };t.horas += c.hours;t.total += c.total;t.ids.push(c.id); });
    resumen = `<div class="tarjeta"><h2>Pendiente de pagar por trabajador</h2>${Object.keys(porTrabajador).length ? `<div class="tabla-envoltorio"><table class="tabla"><thead><tr><th>Trabajador</th><th class="num">Horas</th><th class="num">Importe</th><th></th></tr></thead><tbody>
      ${Object.entries(porTrabajador).map(([id, t]) => `<tr><td>${esc(t.nombre)}</td><td class="num">${horas(t.horas)}</td><td class="num importe">${euros(t.total)}</td><td class="num"><button class="boton secundario pequeno" data-pagar-todo="${t.ids.join(",")}">Marcar todo pagado</button></td></tr>`).join("")}
      </tbody></table></div>` : '<p class="vacio">No hay nada pendiente de pagar.</p>'}</div>`;
  } else {
    resumen = `<div class="rejilla"><div class="dato"><small>Horas pendientes de cobrar</small><strong>${horas(pendientes.reduce((s, c) => s + c.hours, 0))}</strong></div>
      <div class="dato"><small>Te corresponde</small><strong>${euros(pendientes.reduce((s, c) => s + c.total, 0))}</strong><span class="suave">a ${euros(estado.ajustes.hourlyRate)} la hora</span></div></div>`;
  }
  const proximas = reservas.filter(r => r.status !== "cancelada").sort((a, b) => Math.abs(Date.parse(a.checkOut) - Date.now()) - Math.abs(Date.parse(b.checkOut) - Date.now())).slice(0, 12);
  const filas = limpiezas.map(c => { const r = reservaDe(c.reservationId);return `<tr data-reserva="${c.reservationId}" style="cursor:pointer">
      <td>${fecha(c.date)}${c.startTime ? `<br><small class="suave">${esc(c.startTime)}</small>` : ""}</td>
      ${esAdmin() ? `<td>${esc(c.workerName)}</td>` : ""}
      <td>${r ? `${fecha(r.checkIn, { day: "numeric", month: "short" })} → ${fecha(r.checkOut, { day: "numeric", month: "short" })}` : "—"}</td>
      <td class="num">${horas(c.hours)}</td><td class="num importe">${euros(c.total)}</td>
      <td>${c.paid ? '<span class="etiqueta">Pagada</span>' : '<span class="etiqueta ambar">Pendiente</span>'}${c.attachments.length ? ` <span class="etiqueta gris">📎 ${c.attachments.length}</span>` : ""}</td></tr>`; }).join("");
  return `<div class="titulo"><div><h1>${esAdmin() ? "Limpiezas" : "Mis horas"}</h1><p>Horas de limpieza de cada reserva a ${euros(estado.ajustes.hourlyRate)} la hora</p></div>
      <button class="boton" data-anadir-horas>${icono("mas")} Añadir horas</button></div>
    ${resumen}
    <div class="tarjeta"><h2>Registro de horas</h2>${limpiezas.length ? `<div class="tabla-envoltorio"><table class="tabla"><thead><tr><th>Fecha</th>${esAdmin() ? "<th>Trabajador</th>" : ""}<th>Reserva</th><th class="num">Horas</th><th class="num">Importe</th><th>Estado</th></tr></thead><tbody>${filas}</tbody></table></div>` : '<p class="vacio">Aún no hay horas registradas.</p>'}</div>
    <template id="opciones-reservas">${proximas.map(r => `<option value="${r.id}">${fecha(r.checkIn, { day: "numeric", month: "short" })} → ${fecha(r.checkOut, { day: "numeric", month: "short", year: "numeric" })} · ${r.guests || "?"} pers.${esAdmin() && r.guestName ? ` · ${esc(r.guestName)}` : ""}</option>`).join("")}</template>`;
};
enlazar.limpiezas = () => {
  document.querySelectorAll("tr[data-reserva]").forEach(f => f.onclick = () => { estado.pestana = "limpieza";ir(`reserva/${f.dataset.reserva}`); });
  document.querySelectorAll("[data-pagar-todo]").forEach(b => b.onclick = async () => {
    if (!confirmar("¿Marcar como pagadas todas estas horas?")) return;
    for (const id of b.dataset.pagarTodo.split(",")) await enviar(`/api/limpiezas/${id}`, "PUT", { paid: true }).catch(() => {});
    aviso("Marcadas como pagadas");pintar({ silencioso: true });
  });
  document.querySelector("[data-anadir-horas]").onclick = () => {
    const opciones = document.getElementById("opciones-reservas").innerHTML;
    if (!opciones.trim()) return aviso("Todavía no hay reservas.");
    const m = modal(`<h2>Añadir horas de limpieza</h2><form class="formulario">
        <div class="campo ancho"><label>Reserva</label><select name="reservationId">${opciones}</select></div>
        <div class="campo"><label>Fecha</label><input type="date" name="date" value="${hoy()}" required></div>
        <div class="campo"><label>Hora de inicio</label><input type="time" name="startTime"></div>
        <div class="campo"><label>Horas</label><input name="hours" inputmode="decimal" placeholder="Ej.: 3,5" required></div>
        ${esAdmin() ? '<div class="campo"><label>Trabajador</label><select name="workerId"></select></div>' : ""}
        <div class="campo ancho"><label>Observaciones</label><textarea name="notes"></textarea></div>
        <div class="campo ancho"><div class="calculo"><span>A pagar</span><strong data-calculo>${euros(0)}</strong></div></div>
        <div class="campo ancho"><label>Fotos o documentos</label><input type="file" name="archivos" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"></div>
        <div class="campo ancho error"></div></form>
      <div class="pie"><button class="boton secundario" data-cerrar>Cancelar</button><button class="boton" data-guardar>Guardar</button></div>`);
    const form = m.querySelector("form");
    rellenarTrabajadores(form.workerId);
    form.hours.oninput = () => { m.querySelector("[data-calculo]").textContent = euros((Number(form.hours.value.replace(",", ".")) || 0) * estado.ajustes.hourlyRate); };
    m.querySelector("[data-guardar]").onclick = async event => {
      if (!form.reportValidity()) return;
      event.target.disabled = true;
      try {
        const datos = Object.fromEntries(new FormData(form));delete datos.archivos;
        const limpieza = await enviar("/api/limpiezas", "POST", datos);
        for (const original of form.archivos.files) {
          const archivo = await prepararArchivo(original);
          await api(`/api/adjuntos/limpieza/${limpieza.id}`, { method: "POST", body: archivo, headers: { "Content-Type": archivo.type || "application/octet-stream", "X-File-Name": encodeURIComponent(archivo.name) } });
        }
        cerrarModal();aviso("Horas guardadas");pintar({ silencioso: true });
      } catch (error) { event.target.disabled = false;m.querySelector(".error").textContent = error.message; }
    };
  };
};

/* Incidencias (administrador) */
vistas.incidencias = async () => {
  const lista = await api("/api/incidencias"), abiertas = lista.filter(i => i.status !== "resuelta");
  return `<div class="titulo"><div><h1>Incidencias</h1><p>Problemas y roturas detectados en las revisiones</p></div></div>
    <div class="grupo-titulo">Abiertas (${abiertas.length})</div>${abiertas.map(tarjetaIncidencia).join("") || '<p class="vacio">No hay incidencias abiertas.</p>'}
    ${lista.length > abiertas.length ? `<div class="grupo-titulo">Resueltas</div>${lista.filter(i => i.status === "resuelta").map(tarjetaIncidencia).join("")}` : ""}`;
};
enlazar.incidencias = () => { enlazarAdjuntos();enlazarIncidencias(); };

/* Lista de reparaciones (administrador) */
vistas.reparaciones = async () => {
  const lista = await api("/api/reparaciones"), pendientes = lista.filter(r => !r.done), hechas = lista.filter(r => r.done);
  const tarjeta = r => `<div class="tarjeta"><div class="titulo" style="margin-bottom:6px">
      <label class="interruptor" style="align-items:flex-start"><input type="checkbox" data-hecha="${r.id}" ${r.done ? "checked" : ""}><span><span style="${r.done ? "text-decoration:line-through;color:var(--suave)" : ""}">${esc(r.task)}</span>
        <small class="suave" style="display:block;font-weight:400">${r.done ? `Realizada el ${fecha(r.doneAt)}` : `Añadida el ${fecha(r.createdAt)}`}${r.supplier ? ` · ${esc(r.supplier)}` : ""}${r.cost ? ` · <span class="importe">${euros(r.cost)}</span>` : ""}</small></span></label>
      <div class="acciones">${r.done ? '<span class="etiqueta">Realizada</span>' : '<span class="etiqueta ambar">Pendiente</span>'}<button class="boton secundario pequeno" data-editar-reparacion="${r.id}">Editar</button></div></div>
    ${r.details && r.details !== r.task ? `<p style="margin:6px 0;white-space:pre-wrap">${esc(r.details)}</p>` : ""}
    ${bloqueAdjuntos("reparacion", r.id, r.attachments, { texto: "Adjuntar factura" })}</div>`;
  window.__reparaciones = lista;
  return `<div class="titulo"><div><h1>Lista de reparaciones</h1><p>Tareas pendientes, realizadas y sus facturas</p></div>
      <button class="boton" data-nueva-reparacion>${icono("mas")} Nueva reparación</button></div>
    <div class="grupo-titulo">Pendientes (${pendientes.length})</div>${pendientes.map(tarjeta).join("") || '<p class="vacio">No hay reparaciones pendientes.</p>'}
    ${hechas.length ? `<div class="grupo-titulo">Realizadas (${hechas.length})</div>${hechas.map(tarjeta).join("")}` : ""}`;
};
function formularioReparacion(r = {}) {
  const m = modal(`<h2>${r.id ? "Editar reparación" : "Nueva reparación"}</h2><form class="formulario">
      <div class="campo ancho"><label>Tarea</label><input name="task" required value="${esc(r.task || "")}" placeholder="Ej.: Cambiar la cisterna del baño de arriba"></div>
      <div class="campo ancho"><label>Detalles</label><textarea name="details">${esc(r.details || "")}</textarea></div>
      <div class="campo"><label>Profesional / empresa</label><input name="supplier" value="${esc(r.supplier || "")}"></div>
      <div class="campo"><label>Coste (€)</label><input name="cost" inputmode="decimal" value="${esc(r.cost || "")}"></div>
      ${r.id ? `<div class="campo ancho"><label class="interruptor"><input type="checkbox" name="done" ${r.done ? "checked" : ""}> Realizada</label></div>` : ""}
      ${r.id ? "" : '<div class="campo ancho"><label>Factura (opcional)</label><input type="file" name="facturas" multiple accept="image/*,application/pdf"></div>'}
      <div class="campo ancho error"></div></form>
    <div class="pie">${r.id ? '<button class="boton peligro" data-borrar style="margin-right:auto">Eliminar</button>' : ""}<button class="boton secundario" data-cerrar>Cancelar</button><button class="boton" data-guardar>Guardar</button></div>`);
  const form = m.querySelector("form");
  m.querySelector("[data-guardar]").onclick = async event => {
    if (!form.reportValidity()) return;
    event.target.disabled = true;
    try {
      const datos = datosFormulario(form);delete datos.facturas;
      const guardada = await enviar(r.id ? `/api/reparaciones/${r.id}` : "/api/reparaciones", r.id ? "PUT" : "POST", datos);
      for (const original of form.facturas?.files || []) {
        const archivo = await prepararArchivo(original);
        await api(`/api/adjuntos/reparacion/${guardada.id}`, { method: "POST", body: archivo, headers: { "Content-Type": archivo.type || "application/octet-stream", "X-File-Name": encodeURIComponent(archivo.name) } });
      }
      cerrarModal();aviso("Reparación guardada");pintar({ silencioso: true });
    } catch (error) { event.target.disabled = false;m.querySelector(".error").textContent = error.message; }
  };
  m.querySelector("[data-borrar]")?.addEventListener("click", async () => {
    if (!confirmar("¿Eliminar esta reparación y sus facturas?")) return;
    await api(`/api/reparaciones/${r.id}`, { method: "DELETE" });cerrarModal();pintar({ silencioso: true });
  });
}
enlazar.reparaciones = () => {
  enlazarAdjuntos();
  document.querySelector("[data-nueva-reparacion]").onclick = () => formularioReparacion();
  document.querySelectorAll("[data-editar-reparacion]").forEach(b => b.onclick = () => formularioReparacion(window.__reparaciones.find(r => r.id === b.dataset.editarReparacion)));
  document.querySelectorAll("[data-hecha]").forEach(c => c.onchange = async () => {
    try { await enviar(`/api/reparaciones/${c.dataset.hecha}`, "PUT", { done: c.checked });aviso(c.checked ? "Marcada como realizada" : "Marcada como pendiente"); } catch (error) { aviso(error.message); }
    pintar({ silencioso: true });
  });
};

/* Ajustes / Mi cuenta */
vistas.ajustes = async () => {
  const cuenta = `<div class="tarjeta"><h2>Mi cuenta</h2><p class="suave" style="margin-top:-6px">${esc(estado.usuario.name)} · usuario «${esc(estado.usuario.username)}»</p>
      <form class="formulario" id="form-clave">
        <div class="campo"><label>Contraseña actual</label><input type="password" name="current" required autocomplete="current-password"></div>
        <div class="campo"><label>Nueva contraseña</label><input type="password" name="password" minlength="6" required autocomplete="new-password"></div>
        <div class="campo" style="justify-content:flex-end"><button class="boton secundario" type="submit">Cambiar contraseña</button></div></form>
      <button class="boton peligro" data-salir style="margin-top:14px">Cerrar sesión</button></div>`;
  if (!esAdmin()) return `<div class="titulo"><h1>Mi cuenta</h1></div>${cuenta}`;
  const [ajustes, usuarios] = await Promise.all([api("/api/ajustes"), api("/api/usuarios")]);
  estado.ajustes = ajustes;
  const lista = fase => ajustes.checklist[fase].join("\n");
  return `<div class="titulo"><div><h1>Ajustes</h1><p>Tarifa de limpieza, revisiones, usuarios y conexiones</p></div></div>
    <div class="tarjeta"><h2>Limpieza</h2><form class="formulario" id="form-ajustes">
      <div class="campo"><label>Precio por hora (€)</label><input name="hourlyRate" inputmode="decimal" value="${esc(ajustes.hourlyRate)}"></div>
      <div class="campo ancho"><label class="interruptor"><input type="checkbox" name="workersCanInspect" ${ajustes.workersCanInspect ? "checked" : ""}> Permitir que los trabajadores rellenen las revisiones (estado previo/posterior) e incidencias</label></div>
      <div class="campo ancho"><button class="boton" type="submit">Guardar</button></div></form>
      <p class="suave" style="margin:10px 0 0">El nuevo precio se aplica a las horas que se añadan a partir de ahora; las ya registradas mantienen el suyo (se puede cambiar en cada una).</p></div>
    <div class="tarjeta"><h2>Puntos de revisión</h2><p class="suave" style="margin-top:-6px">Uno por línea. Se usan en las reservas cuya revisión aún no se ha empezado.</p>
      <form class="formulario" id="form-checklist">
        <div class="campo"><label>Estado previo a la reserva</label><textarea name="previa" rows="12">${esc(lista("previa"))}</textarea></div>
        <div class="campo"><label>Estado posterior a la reserva</label><textarea name="posterior" rows="12">${esc(lista("posterior"))}</textarea></div>
        <div class="campo ancho"><button class="boton" type="submit">Guardar puntos de revisión</button></div></form></div>
    <div class="tarjeta"><div class="titulo" style="margin-bottom:8px"><h2>Usuarios</h2><button class="boton secundario pequeno" data-nuevo-usuario>${icono("mas")} Nuevo usuario</button></div>
      <div class="tabla-envoltorio"><table class="tabla"><thead><tr><th>Nombre</th><th>Usuario</th><th>Tipo</th><th>Estado</th><th></th></tr></thead><tbody>
      ${usuarios.map(u => `<tr><td>${esc(u.name)}</td><td>${esc(u.username)}</td><td>${u.role === "admin" ? "Administrador" : "Trabajador"}</td><td>${u.active ? '<span class="etiqueta">Activo</span>' : '<span class="etiqueta gris">Desactivado</span>'}</td><td class="num"><button class="boton secundario pequeno" data-editar-usuario="${u.id}">Editar</button></td></tr>`).join("")}
      </tbody></table></div>
      <p class="suave" style="margin:10px 0 0">El trabajador ve las fechas y el número de personas de cada reserva, pero nunca el nombre del huésped ni el importe.</p></div>
    <div class="tarjeta"><h2>Conexiones</h2>
      <p style="margin:0 0 8px"><strong>Servidor de documentos:</strong> ${ajustes.webdav.configured ? `<span class="etiqueta">Conectado</span> <span class="suave">carpeta ${esc(ajustes.webdav.root)}</span>` : '<span class="etiqueta ambar">Sin configurar</span> <span class="suave">los archivos se guardan en el volumen de Railway</span>'}</p>
      <p style="margin:0"><strong>Avaibook:</strong> ${ajustes.avaibook.configured ? `<span class="etiqueta">Conectado</span> <span class="suave">${ajustes.avaibook.lastSync ? `última sincronización ${fechaHora(ajustes.avaibook.lastSync)}` : ""}</span>` : '<span class="etiqueta gris">Pendiente</span> <span class="suave">añade AVAIBOOK_ICAL_URL en Railway para importar las reservas automáticamente</span>'}</p></div>
    ${cuenta}`;
};
function formularioUsuario(u = {}) {
  const propio = u.id === estado.usuario.id;
  const m = modal(`<h2>${u.id ? "Editar usuario" : "Nuevo usuario"}</h2><form class="formulario">
      <div class="campo"><label>Nombre</label><input name="name" required value="${esc(u.name || "")}"></div>
      <div class="campo"><label>Usuario de acceso</label><input name="username" ${u.id ? "disabled" : "required"} autocapitalize="none" value="${esc(u.username || "")}"></div>
      <div class="campo"><label>Tipo</label><select name="role" ${propio ? "disabled" : ""}><option value="trabajador">Trabajador</option><option value="admin" ${u.role === "admin" ? "selected" : ""}>Administrador</option></select></div>
      <div class="campo"><label>${u.id ? "Nueva contraseña (opcional)" : "Contraseña"}</label><input name="password" type="password" minlength="6" ${u.id ? "" : "required"} autocomplete="new-password"></div>
      ${u.id && !propio ? `<div class="campo ancho"><label class="interruptor"><input type="checkbox" name="active" ${u.active ? "checked" : ""}> Activo (puede entrar en la aplicación)</label></div>` : ""}
      <div class="campo ancho error"></div></form>
    <div class="pie"><button class="boton secundario" data-cerrar>Cancelar</button><button class="boton" data-guardar>Guardar</button></div>`);
  m.querySelector("[data-guardar]").onclick = async () => {
    const form = m.querySelector("form");if (!form.reportValidity()) return;
    const datos = datosFormulario(form);if (u.id && !datos.password) delete datos.password;
    try { await enviar(u.id ? `/api/usuarios/${u.id}` : "/api/usuarios", u.id ? "PUT" : "POST", datos);cerrarModal();aviso("Usuario guardado");pintar({ silencioso: true }); }
    catch (error) { m.querySelector(".error").textContent = error.message; }
  };
}
enlazar.ajustes = () => {
  document.querySelector("[data-salir]").onclick = salir;
  document.getElementById("form-clave").onsubmit = async event => {
    event.preventDefault();
    try { await enviar("/api/auth/password", "POST", datosFormulario(event.target));event.target.reset();aviso("Contraseña cambiada"); } catch (error) { aviso(error.message); }
  };
  if (!esAdmin()) return;
  document.getElementById("form-ajustes").onsubmit = async event => {
    event.preventDefault();
    try { await enviar("/api/ajustes", "PUT", datosFormulario(event.target));aviso("Ajustes guardados");pintar({ silencioso: true }); } catch (error) { aviso(error.message); }
  };
  document.getElementById("form-checklist").onsubmit = async event => {
    event.preventDefault();
    const f = event.target, partir = t => t.split("\n").map(x => x.trim()).filter(Boolean);
    try { await enviar("/api/ajustes", "PUT", { checklist: { previa: partir(f.previa.value), posterior: partir(f.posterior.value) } });aviso("Puntos de revisión guardados"); } catch (error) { aviso(error.message); }
  };
  document.querySelector("[data-nuevo-usuario]").onclick = () => formularioUsuario();
  document.querySelectorAll("[data-editar-usuario]").forEach(b => b.onclick = async () => formularioUsuario((await api("/api/usuarios")).find(u => u.id === b.dataset.editarUsuario)));
};

/* ---------- Siempre al día ---------- */
// Cada 15 segundos se pregunta al servidor si hay datos nuevos (de otro usuario o de Avaibook) o una
// versión nueva de la aplicación publicada en Railway; así nunca hace falta actualizar a mano.
function ocupado() {
  const activo = document.activeElement;
  return Boolean(document.querySelector(".modal-fondo") || (activo && /^(INPUT|TEXTAREA|SELECT)$/.test(activo.tagName)));
}
async function comprobarCambios() {
  if (document.hidden) return;
  try {
    if (!estado.usuario) {
      const { version } = await api("/api/version");
      if (estado.version && version !== estado.version) location.reload();
      estado.version = version;return;
    }
    const { version, data } = await api("/api/estado");
    if (estado.version === null) estado.version = version;
    else if (version !== estado.version && !document.querySelector(".actualizar")) {
      const nodo = document.createElement("div");nodo.className = "actualizar";
      nodo.innerHTML = '<span>Hay una versión nueva</span><button type="button">Actualizar</button>';
      nodo.querySelector("button").onclick = () => location.reload();
      document.body.appendChild(nodo);
    }
    if (estado.huellaDatos && data !== estado.huellaDatos && !ocupado()) {
      estado.ajustes = await api("/api/ajustes");
      await pintar({ silencioso: true });
    }
    if (!ocupado() || !estado.huellaDatos) estado.huellaDatos = data;
  } catch {}
}
setInterval(comprobarCambios, 15000);
document.addEventListener("visibilitychange", comprobarCambios);

iniciar().then(comprobarCambios);
