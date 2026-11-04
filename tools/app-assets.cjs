// Genera las imágenes de partida de la app móvil (mobile/assets) a partir de los logos oficiales.
// Después: cd mobile && npm run assets   (crea todos los tamaños de iconos y pantallas de arranque)
const path = require("path");
const sharp = require(path.join(__dirname, "../mobile/node_modules/sharp"));
const B = path.join(__dirname, "../brand/oficial"), OUT = path.join(__dirname, "../mobile/assets"), WWW = path.join(__dirname, "../mobile/www");
const CREAM = "#f4ede5", NAVY = "#07213d";
const trim = file => sharp(path.join(B, file)).trim().png().toBuffer();
const fit = async (buf, w, h) => sharp(buf).resize({ width: w, height: h, fit: "inside" }).png().toBuffer();
const canvas = (size, bg) => sharp({ create: { width: size, height: size, channels: 4, background: bg } });

(async () => {
  // La P sola: parte izquierda del logo horizontal (hasta la barra vertical)
  const horiz = await trim("horizontal-arena-marino.png"), meta = await sharp(horiz).metadata();
  const mark = await sharp(horiz).extract({ left: 0, top: 0, width: Math.round(meta.width * 0.17), height: meta.height }).trim().png().toBuffer();
  const markIcon = await fit(mark, 620, 620), markFg = await fit(mark, 560, 560);
  await canvas(1024, CREAM).composite([{ input: markIcon, gravity: "center" }]).png().toFile(path.join(OUT, "icon-only.png"));
  await canvas(1024, { r: 0, g: 0, b: 0, alpha: 0 }).composite([{ input: markFg, gravity: "center" }]).png().toFile(path.join(OUT, "icon-foreground.png"));
  await canvas(1024, CREAM).png().toFile(path.join(OUT, "icon-background.png"));
  // Arranque: logo horizontal en crema (claro) y vertical blanco/arena en marino (oscuro).
  // En vertical el móvil solo enseña la franja central (~1260 px de ancho): el logo no debe pasar de ~1000.
  await canvas(2732, CREAM).composite([{ input: await fit(horiz, 1000, 1000), gravity: "center" }]).png().toFile(path.join(OUT, "splash.png"));
  await canvas(2732, NAVY).composite([{ input: await fit(await trim("vertical-arena-blanco.png"), 760, 760), gravity: "center" }]).png().toFile(path.join(OUT, "splash-dark.png"));
  // Logo de la página «Sin conexión»
  await sharp(await fit(horiz, 900, 900)).toFile(path.join(WWW, "logo.png"));
  console.log("ok");
})();
