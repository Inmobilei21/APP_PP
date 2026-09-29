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
