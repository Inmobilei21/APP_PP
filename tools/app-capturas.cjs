// Monta las capturas de las tiendas: fondo crema, titular y la captura con esquinas redondeadas.
// Uso: node tools/app-capturas.cjs <carpeta con capturas en bruto (ios-*.png / android-*.png)>
const path = require("path");
const sharp = require(path.join(__dirname, "../mobile/node_modules/sharp"));
const SRC = process.argv[2], OUT = path.join(__dirname, "../mobile/tienda");
const NAVY = "#07213d", SAND = "#b8925f", CREAM = "#f4ede5";
const PANTALLAS = [
  ["1-inicio", "Tu área de cliente,", "siempre contigo"],
  ["2-documentos", "Toda tu documentación,", "ordenada y a mano"],
  ["4-chat", "Escribe a tu asesor", "cuando lo necesites"],
  ["5-avisos", "Avisos importantes,", "a tiempo"],
  ["6-servicios", "Descubre todos", "nuestros servicios"]
];
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

async function montar(raw, W, H, l1, l2, file) {
  const top = Math.round(H * 0.2), shotW = Math.round(W * 0.8), r = Math.round(W * 0.05);
  const shot = await sharp(raw).resize({ width: shotW }).png().toBuffer();
  const { height: sh } = await sharp(shot).metadata();
  const visible = Math.min(sh, H - top);           // la captura se corta por abajo, como si saliera del borde
  const mask = Buffer.from(`<svg width="${shotW}" height="${visible}"><rect width="${shotW}" height="${visible + r}" rx="${r}" ry="${r}"/></svg>`);
  const rounded = await sharp(shot).extract({ left: 0, top: 0, width: shotW, height: visible }).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  const fs1 = Math.round(W * 0.066);
  const text = Buffer.from(`<svg width="${W}" height="${top}" xmlns="http://www.w3.org/2000/svg">
    <text x="50%" y="${Math.round(top * 0.47)}" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700" font-size="${fs1}" fill="${NAVY}">${esc(l1)}</text>
    <text x="50%" y="${Math.round(top * 0.47 + fs1 * 1.2)}" text-anchor="middle" font-family="DejaVu Sans, Liberation Sans, sans-serif" font-weight="700" font-size="${fs1}" fill="${SAND}">${esc(l2)}</text></svg>`);
  const shadow = await sharp({ create: { width: shotW + 60, height: visible + 60, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: Buffer.from(`<svg width="${shotW + 60}" height="${visible + 60}"><rect x="30" y="34" width="${shotW}" height="${visible + r}" rx="${r}" fill="rgba(7,33,61,.28)"/></svg>`) }]).blur(18).png().toBuffer();
  await sharp({ create: { width: W, height: H, channels: 3, background: CREAM } })
    .composite([{ input: text, top: 0, left: 0 }, { input: shadow, top: top - 30, left: Math.round((W - shotW) / 2) - 30 }, { input: rounded, top, left: Math.round((W - shotW) / 2) }])
    .png().toFile(file);
}

(async () => {
  for (const [name, l1, l2] of PANTALLAS) {
    await montar(path.join(SRC, `ios-${name}.png`), 1290, 2796, l1, l2, path.join(OUT, "capturas-iphone", `${name}.png`));
    await montar(path.join(SRC, `android-${name}.png`), 1080, 1920, l1, l2, path.join(OUT, "capturas-android", `${name}.png`));
  }
  // Google Play: icono 512 y gráfico destacado 1024×500
  await sharp(path.join(__dirname, "../mobile/assets/icon-only.png")).resize(512, 512).png().toFile(path.join(OUT, "icono-512.png"));
  const logo = await sharp(path.join(__dirname, "../brand/oficial/horizontal-arena-marino.png")).trim().resize({ width: 620 }).png().toBuffer();
  const lema = Buffer.from(`<svg width="1024" height="500"><text x="512" y="372" text-anchor="middle" font-family="DejaVu Sans, sans-serif" font-size="34" font-weight="700" fill="${NAVY}">Tu área de cliente, siempre contigo</text>
    <rect x="0" y="488" width="1024" height="12" fill="${SAND}"/></svg>`);
  await sharp({ create: { width: 1024, height: 500, channels: 3, background: CREAM } }).composite([{ input: logo, top: 150, left: 202 }, { input: lema, top: 0, left: 0 }]).png().toFile(path.join(OUT, "grafico-destacado-1024x500.png"));
  console.log("ok");
})();
