/* PP · Service worker mínimo: solo recibe los PDF que se comparten a la app desde el móvil
   (Web Share Target). No guarda en caché nada más: el resto de peticiones van directas a la red. */
const SHARE_CACHE = "pp-compartidos";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (event.request.method !== "POST" || url.pathname !== "/compartir") return;
  event.respondWith((async () => {
    try {
      const form = await event.request.formData();
      const files = form.getAll("documentos").filter(file => file && typeof file === "object" && file.size);
      const cache = await caches.open(SHARE_CACHE);
      await Promise.all(files.map((file, i) => cache.put(`/compartido/${Date.now()}-${i}`, new Response(file, {
        headers: { "Content-Type": file.type || "application/pdf", "X-File-Name": encodeURIComponent(file.name || "documento.pdf") }
      }))));
      return Response.redirect(files.length ? "/#compartido=1" : "/#compartido=vacio", 303);
    } catch {
      return Response.redirect("/#compartido=error", 303);
    }
  })());
});

/* Notificaciones push: se muestran y, al pulsarlas, abren la app en el apartado del aviso. */
self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "Aviso", {
    body: data.body || "", icon: "/app-icon-192.png", badge: "/app-icon-192.png",
    tag: data.tag || undefined, renotify: Boolean(data.tag), data: { url: data.url || "/" }
  }));
});
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find(client => new URL(client.url).origin === self.location.origin);
    if (open) { await open.focus(); open.postMessage({ type: "abrir", url }); return; }
    await self.clients.openWindow(url);
  })());
});
