# App móvil de ProPymes Asesores (iPhone y Android)

App nativa hecha con [Capacitor](https://capacitorjs.com) que abre el área de cliente de
**https://app.propymesasesores.es**. Toda la lógica está en la web (este mismo repositorio), así que
los cambios de la web llegan a la app sin publicar una versión nueva. La app añade lo nativo:

- Icono, pantalla de arranque y nombre «ProPymes Asesores».
- **Notificaciones nativas** (Apple y Google) con los mismos avisos que las notificaciones web
  (mensajes, tareas, recordatorios…), activables en «Mi cuenta → Notificaciones».
- Página propia de «Sin conexión» (`www/sin-conexion.html`).

| | |
|---|---|
| Identificador | `es.propymesasesores.app` |
| Web que abre | `capacitor.config.json` → `server.url` |
| Iconos y arranque | `assets/` (se generan con `node ../tools/app-assets.cjs` y `npm run assets`) |
| Ficha de las tiendas | `tienda/FICHA.md` y sus imágenes |
| Compilación | GitHub Actions: `.github/workflows/app-movil.yml` |

## Piezas en la web (fuera de esta carpeta)

- `brand/app-nativa/pp-app-nativa.js` → `public/pp-app-nativa.js`: solo actúa dentro de la app
  (registro del dispositivo, interruptor en «Mi cuenta», abrir el apartado al pulsar un aviso).
- `brand/app-nativa/push-nativo.js` → `push-nativo.js`: envía por APNs (iPhone) y FCM (Android) los
  avisos que ya manda `push.js`. Se engancha a `push.js` desde `tools/brand-pp.py`.
- `brand/app-nativa/privacidad.html` → https://app.propymesasesores.es/privacidad.html

## Compilar

Cada cambio en `mobile/` lanza la compilación en GitHub (pestaña **Actions → App móvil**):

- **Android:** genera `propymes-asesores.apk` (artefacto «propymes-android»), instalable directamente
  en un móvil Android para probar.
- **iPhone:** comprueba que compila. La versión firmada para TestFlight / App Store se configura
  cuando la cuenta de Apple Developer esté activa (necesita certificado y perfil de la cuenta).

En local (necesita Android Studio / Xcode):

```bash
cd mobile
npm ci
npx cap sync
npx cap open android   # o: npx cap open ios   (solo en Mac)
```

## Notificaciones: lo que falta configurar

Sin estas claves la app funciona igual, pero no llegan notificaciones nativas.

**Android (Firebase Cloud Messaging)**
1. Crear un proyecto en https://console.firebase.google.com con la cuenta info@propymesasesores.es.
2. Añadir una app Android con el paquete `es.propymesasesores.app` y descargar `google-services.json`.
3. En GitHub → Settings → Secrets → Actions: secreto `GOOGLE_SERVICES_JSON` con el contenido de ese archivo.
4. Firebase → Configuración → Cuentas de servicio → «Generar nueva clave privada». En Railway (servicio PP),
   variable `FIREBASE_SERVICE_ACCOUNT` con el contenido de ese JSON.

**iPhone (Apple Push Notification service)**
1. developer.apple.com → Certificates, Identifiers & Profiles → **Keys** → nueva clave con «Apple Push
   Notifications service (APNs)». Descargar el `.p8` (solo se puede una vez) y apuntar el *Key ID*.
2. En Railway (servicio PP): `APNS_KEY` (contenido del .p8), `APNS_KEY_ID`, `APNS_TEAM_ID` (el Team ID de la cuenta).
3. En el identificador `es.propymesasesores.app`, activar la capacidad **Push Notifications**.

## Publicar

1. Google Play Console → crear la app «ProPymes Asesores» → subir el `.aab` firmado → rellenar la ficha con
   `tienda/FICHA.md` → prueba interna → producción.
2. App Store Connect → nueva app con el bundle `es.propymesasesores.app` → subir la compilación (Xcode o CI)
   → TestFlight → ficha con `tienda/FICHA.md` → enviar a revisión.
