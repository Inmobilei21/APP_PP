# Ficha de la app en las tiendas · ProPymes Asesores

Datos para rellenar App Store Connect (Apple) y Google Play Console. Las imágenes están en esta misma carpeta.

## Datos comunes

| Campo | Valor |
|---|---|
| Nombre de la app | **ProPymes Asesores** |
| Identificador (bundle / paquete) | `es.propymesasesores.app` |
| Desarrollador | PRO PYMES ASESORES LEGALES SOCIEDAD LIMITADA PROFESIONAL (en la tienda: «ProPymes Asesores») |
| Idioma principal | Español (España) |
| Categoría | Apple: **Empresa** (secundaria: Productividad) · Google: **Empresa** |
| Precio | Gratis, sin compras ni anuncios |
| Web | https://propymesasesores.es |
| Política de privacidad | https://app.propymesasesores.es/privacidad.html |
| Soporte / contacto | info@propymesasesores.es · 677 53 39 27 |
| Edad | Apple: 4+ · Google: «Para todos» (cuestionario sin contenido sensible) |

## Textos

**Subtítulo (Apple, máx. 30):**
Tu área de cliente, contigo

**Descripción breve (Google, máx. 80):**
Tu documentación, tus declaraciones y tu asesor de ProPymes, siempre a mano.

**Descripción (Apple y Google):**

> La app de ProPymes Asesores es tu área de cliente en el móvil: toda la relación con tu asesoría, en un solo sitio, segura y siempre disponible.
>
> CON LA APP PUEDES
> • Consultar tu documentación: facturas, bancos, contabilidad y el resto de documentos que compartimos contigo, ordenados por carpetas.
> • Ver tus declaraciones e impuestos presentados.
> • Escribir a tu asesor y recibir su respuesta en la propia app.
> • Recibir avisos importantes: plazos, documentación que necesitamos o novedades que te afectan.
> • Descubrir el resto de servicios del despacho (laboral, protección de datos, auditoría, gestión administrativa, jurídico y seguros) y pedir información sin compromiso.
>
> NOTIFICACIONES
> Activa las notificaciones en «Mi cuenta» para enterarte al momento de los mensajes de tu asesor y de los avisos del despacho.
>
> ACCESO
> La app es para clientes de ProPymes Asesores. Tu usuario y contraseña te los facilita el despacho; si aún no los tienes, escríbenos a info@propymesasesores.es.
>
> ProPymes Asesores · Asesoría fiscal, contable, laboral y jurídica para pymes y autónomos. Jaén.

**Palabras clave (Apple, máx. 100 caracteres, separadas por comas):**
asesoria,gestoria,asesor,fiscal,contable,laboral,impuestos,declaraciones,autonomos,pymes,documentos

**Novedades de esta versión (1.0):**
Primera versión de la app de ProPymes Asesores.

## Imágenes

| Tienda | Archivos | Tamaño |
|---|---|---|
| Apple · iPhone 6,7"/6,9" | `capturas-iphone/*.png` (5) | 1290 × 2796 |
| Google · teléfono | `capturas-android/*.png` (5) | 1080 × 1920 |
| Google · icono | `icono-512.png` | 512 × 512 |
| Google · gráfico destacado | `grafico-destacado-1024x500.png` | 1024 × 500 |

El icono de Apple va dentro de la app (lo genera `npm run assets`).

## Cuenta de prueba para la revisión

Apple y Google revisan la app por dentro. En «Información para la revisión» / «Acceso a la app» indicar:

- Usuario: **Cliente**
- Contraseña: **prueba**
- Nota: *«Cuenta de demostración del área de cliente. Tras iniciar sesión pide un nombre de empresa de ejemplo (cualquiera vale). Los documentos y datos son ficticios. Los clientes reales reciben su usuario del despacho; la app no permite crear cuentas.»*

Esta cuenta tiene que seguir funcionando mientras dure la revisión (y después, en cada actualización).

## Cuestionarios de privacidad

**Apple · «Privacidad de la app» (etiquetas de privacidad):**
- ¿Se recogen datos? Sí.
- Información de contacto (nombre, correo, teléfono): solo si el usuario pide información de un servicio → *Funcionalidad de la app*, vinculada al usuario, sin rastreo.
- Contenido del usuario (mensajes, documentos): *Funcionalidad de la app*, vinculada al usuario, sin rastreo.
- Identificadores (ID de usuario): *Funcionalidad de la app*, vinculada al usuario, sin rastreo.
- Rastreo (tracking): **No**.

**Google · «Seguridad de los datos»:**
- ¿Recoge o comparte datos? Recoge; **no comparte** con terceros.
- Datos: información personal (nombre, correo, teléfono), mensajes, archivos y documentos, ID de dispositivo u otros (token de notificaciones).
- Finalidad: funcionalidad de la app y comunicaciones del desarrollador. Tratamiento obligatorio salvo el formulario de información (opcional).
- Cifrado en tránsito: **Sí** (HTTPS).
- ¿Se pueden eliminar los datos? Sí, a petición en info@propymesasesores.es (está en la política de privacidad).
- Cuentas: la app no permite crear cuentas (las da de alta el despacho).

## Declaraciones en Google Play («Contenido de la app»)

- Anuncios: **No**.
- Público objetivo: mayores de 18.
- App de noticias: No · Apps de salud: No · Préstamos/financieras: No (es una asesoría, no ofrece servicios financieros).
- Acceso a la app: con credenciales (cuenta de prueba de arriba).
