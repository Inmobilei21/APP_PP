/* PP · Dentro de la app nativa (iPhone / Android con Capacitor).
   - Marca <html class="app-nativa"> para los ajustes de estilo propios de la app.
   - Notificaciones: usa las nativas (Apple / Google) en lugar de las web, que no existen dentro de una app.
     En «Mi cuenta → Notificaciones» el interruptor activa este dispositivo y los tipos son los mismos de siempre.
   - Al pulsar una notificación se abre el apartado que corresponde.
   En el navegador no hace nada. Se carga después de app.js y notificaciones.js. */
(() => {
  const Cap = window.Capacitor;
  if (!Cap?.isNativePlatform?.()) return;
  document.documentElement.classList.add("app-nativa");
  // Barra de estado con iconos oscuros: las cabeceras del área de cliente son claras (arena / crema).
  Cap.Plugins?.StatusBar?.setStyle?.({ style: "LIGHT" }).catch?.(() => {});
  const Push = Cap.Plugins?.PushNotifications;
  const platform = Cap.getPlatform();
  const KEY = "ppTokenNativo";
  const store = { get: () => { try { return localStorage.getItem(KEY) || ""; } catch { return ""; } }, set: v => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} } };

  let esperando = null;   // promesa del token mientras se registra
  function obtenerToken() {
    if (esperando) return esperando;
    esperando = new Promise(async (resolve, reject) => {
      const ok = await Push.addListener("registration", t => { ok.remove(); ko.remove(); resolve(t.value); });
      const ko = await Push.addListener("registrationError", e => { ok.remove(); ko.remove(); reject(new Error(e?.error || "No se pudo registrar el dispositivo.")); });
      try { await Push.register(); } catch (error) { ok.remove(); ko.remove(); reject(error); }
    }).finally(() => { esperando = null; });
    return esperando;
  }
  async function activar() {
    let perm = await Push.checkPermissions();
    if (perm.receive === "prompt" || perm.receive === "prompt-with-rationale") perm = await Push.requestPermissions();
    if (perm.receive !== "granted") throw new Error("Las notificaciones están bloqueadas: actívalas en los Ajustes del móvil para esta app.");
    const token = await obtenerToken();
    await apiJson("/api/push/nativo", { method: "POST", body: JSON.stringify({ token, platform }) });
    store.set(token);
  }
  async function desactivar() {
    const token = store.get(); if (!token) return;
    await apiJson("/api/push/nativo/baja", { method: "POST", body: JSON.stringify({ token }) }).catch(() => {});
    store.set("");
  }

  // Al entrar: si ya tenía permiso, se renueva el registro (el token puede cambiar).
  async function renovar() {
    if (!Push || !signedInUser || signedInUser.role === "demo") return;
    try { if ((await Push.checkPermissions()).receive === "granted" && store.get()) await activar(); } catch {}
  }
  if (window.__authDecidida) renovar(); else document.addEventListener("auth-decidida", renovar, { once: true });

  // Al pulsar una notificación: misma ruta que las web (/#ir=chat, /#ir=tareas…), que gestiona notificaciones.js.
  Push?.addListener("pushNotificationActionPerformed", action => {
    const url = action?.notification?.data?.url;
    if (typeof url === "string" && url.startsWith("/")) location.href = url;
  });

  // «Mi cuenta → Notificaciones»: interruptor del dispositivo nativo + tipos.
  const row = (name, on, label, small = "") => `<label class="nt-row"><span><strong>${label}</strong>${small ? `<small>${small}</small>` : ""}</span><input type="checkbox" class="nt-switch" data-ntn="${name}"${on ? " checked" : ""}></label>`;
  async function dibujar(box) {
    if (!Push) { box.innerHTML = '<p class="nt-note">Esta versión de la app no admite notificaciones.</p>'; return; }
    box.innerHTML = '<p class="nt-note">Cargando…</p>';
    let data, perm;
    try { [data, perm] = await Promise.all([apiJson(`/api/push/nativo?token=${encodeURIComponent(store.get())}`), Push.checkPermissions()]); }
    catch (error) { box.innerHTML = `<p class="nt-note">${escapeHtml(error.message)}</p>`; return; }
    const on = data.registered && perm.receive === "granted";
    const tipos = Object.entries(data.types).filter(([type]) => signedInUser?.role === "admin" || !["facturacion", "presupuestos", "sugerencias"].includes(type));
    box.innerHTML = `<div class="nt-card">${row("activo", on, "Notificaciones en este dispositivo", on ? "Activadas" : perm.receive === "denied" ? "Bloqueadas en los Ajustes del móvil" : "Desactivadas")}
      ${on ? `<div class="nt-types">${tipos.map(([type, label]) => row(type, data.prefs[type] !== false, label)).join("")}</div>` : ""}<p class="nt-msg" role="status"></p></div>`;
    const msg = box.querySelector(".nt-msg");
    box.querySelectorAll("[data-ntn]").forEach(input => input.addEventListener("change", async () => {
      input.disabled = true; msg.textContent = "";
      try {
        if (input.dataset.ntn === "activo") { if (input.checked) await activar(); else await desactivar(); return dibujar(box); }
        await apiJson("/api/push/prefs", { method: "PUT", body: JSON.stringify({ [input.dataset.ntn]: input.checked }) });
      } catch (error) { input.checked = !input.checked; msg.textContent = error.message; }
      input.disabled = false;
    }));
  }
  const previo = openAccountPanel;
  window.openAccountPanel = openAccountPanel = function () {
    const result = previo.apply(this, arguments);
    const web = document.querySelector("#accountPanel .nt-box:not(.nt-nativo)");
    if (web && signedInUser?.role !== "demo") {
      // Caja nueva: la de las notificaciones web se sigue rellenando sola (asíncrona) y la pisaría.
      const box = web.cloneNode(false); box.classList.add("nt-nativo"); web.replaceWith(box); dibujar(box);
    }
    return result;
  };
  // Al cerrar sesión se da de baja este dispositivo para que no lleguen avisos de esa cuenta.
  document.addEventListener("click", event => {
    if (event.target.closest?.(".logout-button, .s2-salir, .cd2-salir")) desactivar();
  }, true);
})();
