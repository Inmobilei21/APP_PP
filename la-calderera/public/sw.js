/* La Calderera · Service worker mínimo para poder instalar la app en el móvil.
   No guarda nada en caché: todo va directo al servidor para estar siempre actualizado. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
