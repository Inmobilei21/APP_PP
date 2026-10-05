# APP LC · La Calderera

Aplicación de gestión de la casa rural **La Calderera** (tu naturaleza). Misma base que APP.AM y APP PP: servidor Node sin dependencias, desplegado en Railway, datos en el volumen `/data` y documentos en el servidor WebDAV del despacho. Se actualiza sola: cada vez que se publica un cambio en GitHub, Railway lo despliega y la app avisa para recargar; los datos nuevos (de otro usuario o de Avaibook) aparecen sin tocar nada.

## Qué hace

- **Reservas**: alta manual o importación automática desde **Avaibook** (que reúne Booking y Airbnb).
- **Limpieza** de cada reserva: fecha, hora de inicio, horas y cálculo automático de lo que hay que pagar (10 €/hora por defecto, editable en Ajustes). Fotos y documentos adjuntos.
- **Estado previo** y **estado posterior** de cada reserva: lista de puntos a revisar (cristales, camas, muebles…) con ✓ / ✕, editable en Ajustes.
- **Incidencias**: cualquier problema o rotura, con fotos, gravedad, coste y estado; se pueden pasar a reparaciones.
- **Lista de reparaciones**: tarea, realizada / pendiente y factura adjunta.
- **Dos tipos de usuario**:
  - *Administrador*: todo.
  - *Trabajador*: ve fechas y número de personas de las reservas, pero **nunca el nombre del huésped ni el importe** (el servidor no se lo envía). Solo puede añadir sus horas de limpieza y adjuntar fotos o documentos. Desde Ajustes se le puede permitir además rellenar las revisiones e incidencias.

La primera vez que se abre pide crear la cuenta del administrador; los trabajadores se dan de alta en *Ajustes → Usuarios*.

## Variables de Railway

| Variable | Para qué |
| --- | --- |
| `WEBDAV_USERNAME`, `WEBDAV_PASSWORD` | Credenciales del servidor de documentos (las mismas que en APP.AM / APP PP). Sin ellas los archivos se guardan en el volumen. |
| `WEBDAV_URL` | Por defecto `https://servidor.asesoriamolinero.es`. |
| `WEBDAV_ROOT` | Carpeta donde se guardan los documentos. Por defecto `LA_CALDERERA`. |
| `AVAIBOOK_ICAL_URL` | Enlace iCal de exportación del calendario del alojamiento en Avaibook. Las reservas se importan cada 15 minutos. |
| `DATA_DIR` | Opcional. Por defecto `/data` (hay que montar un volumen en Railway en `/data`). |

## Despliegue

Servicio de Railway conectado a este repositorio (o, mientras viva dentro de APP_PP, con *Root Directory* = `la-calderera`), con un volumen montado en `/data`. Arranque: `node server.js`.

En local: `DATA_DIR=.data NODE_ENV=development node server.js` y abrir http://localhost:3000.
