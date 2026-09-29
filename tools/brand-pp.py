#!/usr/bin/env python3
"""Genera APP_PP a partir del código actual de APP.AM aplicando la marca ProPymes.

Uso:  python3 tools/brand-pp.py <ruta_APP.AM> <ruta_APP_PP>

Copia todo el código de APP.AM (misma lógica, plantillas, clientes, trabajadores…)
y solo cambia la capa visual: paleta de colores, logotipos, iconos y textos de marca.
Se puede volver a ejecutar cada vez que APP.AM cambie para mantener PP al día.
Requiere: pip install pillow cairosvg
"""
import colorsys, io, os, re, shutil, sys
from pathlib import Path

AM, PP = Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve()
BRAND = PP / "brand"          # logos fuente de ProPymes (se conservan en el repo PP)
KEEP = {".git", "brand", "tools"}

# ---------------------------------------------------------------- 1. copiar código
for item in PP.iterdir():
    if item.name not in KEEP:
        shutil.rmtree(item) if item.is_dir() else item.unlink()
for item in AM.iterdir():
    if item.name in KEEP:
        continue
    dst = PP / item.name
    shutil.copytree(item, dst) if item.is_dir() else shutil.copy2(item, dst)

# ---------------------------------------------------------------- 2. paleta
# ProPymes: azul marino #07213d · arena #d2b48c · crema #f4ede5
NAVY_H, TAN_H = 211 / 360, 34 / 360

def remap(r, g, b):
    h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
    deg = h * 360
    if not (198 <= deg <= 252) or s < 0.18:
        return None                      # no es azul: se deja igual
    if deg < 209 and s > 0.85 and l > 0.3:
        return None                      # azules cielo informativos: se dejan
    if l <= 0.30:                        # marinos → marino PP
        h, s = NAVY_H, min(s, 0.8)
    elif l < 0.58:
        if s >= 0.45:                    # azul corporativo AM → marino PP
            h, s, l = NAVY_H, 0.72, 0.13 + (l - 0.30) * 0.5
        else:                            # grises pizarra → pizarra marina
            h = NAVY_H
    elif l < 0.86:
        if s >= 0.5:                     # lavanda sobre fondo oscuro → arena
            h, s, l = TAN_H, 0.45, 0.55 + (l - 0.58) * 0.6
        else:                            # gris azulado medio → gris cálido
            h, s = TAN_H, s * 0.35
    else:
        if s >= 0.5:                     # tintes azul claro → crema
            h, s = 33 / 360, min(s, 0.55) * 0.8
        else:                            # bordes/grises muy claros → cálidos suaves
            h, s = TAN_H, s * 0.5
    r2, g2, b2 = colorsys.hls_to_rgb(h, l, s)
    return round(r2 * 255), round(g2 * 255), round(b2 * 255)

def hex_sub(m):
    x = m.group(1)
    full = "".join(c * 2 for c in x) if len(x) in (3, 4) else x
    rgb = [int(full[i:i + 2], 16) for i in (0, 2, 4)]
    new = remap(*rgb)
    if not new:
        return m.group(0)
    alpha = full[6:8] if len(full) == 8 else ""
    return "#" + "".join(f"{v:02x}" for v in new) + alpha

def rgba_sub(m):
    fn, r, g, b, rest = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
    new = remap(r, g, b)
    return m.group(0) if not new else f"{fn}({new[0]},{new[1]},{new[2]}{rest})"

HEX = re.compile(r"#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-zA-Z_-])")
RGB = re.compile(r"(rgba?)\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*((?:,\s*[\d.]+\s*)?)\)")
DATAURI = re.compile(r"data:[^\"')\s]+;base64,[A-Za-z0-9+/=]+")

def recolor(text):
    # protege los data URI (imágenes incrustadas) y las entidades HTML (&#123;)
    saved = []
    def keep(m):
        saved.append(m.group(0)); return f"\0{len(saved)-1}\0"
    text = DATAURI.sub(keep, text)
    text = re.sub(r"&#x?[0-9a-fA-F]+;", keep, text)
    text = HEX.sub(hex_sub, text)
    text = RGB.sub(rgba_sub, text)
    return re.sub(r"\0(\d+)\0", lambda m: saved[int(m.group(1))], text)

# ---------------------------------------------------------------- 3. textos de marca
def img_uri(tag_ctx):
    return re.compile(r'(<img[^>]*?class="' + tag_ctx + r'"[^>]*?src=")data:image/[a-z+]+;base64,[A-Za-z0-9+/=]+(")')

TEXT = [
    ("AM · Gestión del despacho", "PP · Gestión del despacho"),
    ("Molinero · Asesoría Fiscal y Auditoría de Cuentas", "ProPymes Asesores Legales"),
    ("DESPACHO MOLINERO", "PROPYMES ASESORES"),
    ("Despacho Molinero", "ProPymes Asesores"),
    ("despacho Molinero", "ProPymes Asesores"),
    ("Asesoría Molinero", "ProPymes Asesores"),
    ("ASESORÍA<br>MOLINERO", "PROPYMES<br>ASESORES"),
    ("} MOLINERO</p>", "} PROPYMES</p>"),
    ('alt="Molinero"', 'alt="ProPymes"'),
    ('<div class="client-desktop-message"><span>AM</span>', '<div class="client-desktop-message"><span>PP</span>'),
    ('<span class="cd2-av">AM</span>', '<span class="cd2-av">PP</span>'),
    ("/splash-logo.png?v=3", "/splash-logo.png?v=pp7"),
    ("/app-icon-192.png?v=5", "/app-icon-192.png?v=pp7"),
    ("/app-icon.png\"", "/app-icon.png?v=pp7\""),
]

def rebrand(path):
    text = path.read_text(encoding="utf8")
    for a, b in TEXT:
        text = text.replace(a, b)
    if path.name == "index.html":
        # logos incrustados de Molinero → logos ProPymes
        text = re.sub(r'(<div class="brand"><img src=")data:image/[a-z+]+;base64,[A-Za-z0-9+/=]+(")', r"\1/logo-pp-light.png?v=pp7\2", text)
        text = img_uri("mobile-logo").sub(r"\1/logo-pp.png?v=pp7\2", text)
        text = re.sub(r'(href="/(?:favicon|apple-touch-icon)\.png)\?v=\d+', r"\1?v=pp7", text)
        text = text.replace('href="/manifest.webmanifest?v=5"', 'href="/manifest.webmanifest?v=pp7"')
        text = re.sub(r'(<link rel="stylesheet" href="/styles\.css)(\?v=[^"]*)?"', r'\1\2"><link rel="stylesheet" href="/pp-theme.css?v=pp23"', text, count=1)
    if path.name == "app.js":
        text = img_uri("chat-brand-logo").sub(r"\1/app-icon-192.png?v=pp7\2", text)
    path.write_text(recolor(text), encoding="utf8")

pub = PP / "public"
# El selector de despacho de APP.AM (despacho-cliente.*) no se usa en PP: PP tiene el suyo (pp-gestion.js)
for extra in ["despacho-cliente.js", "despacho-cliente.css"]:
    (pub / extra).unlink(missing_ok=True)
shutil.rmtree(pub / "propymes", ignore_errors=True)
_idx = (pub / "index.html").read_text(encoding="utf8")
_idx = re.sub(r'<link rel="stylesheet" href="/despacho-cliente\.css[^"]*">', "", _idx)
_idx = re.sub(r'<script src="/despacho-cliente\.js[^"]*"></script>', "", _idx)
(pub / "index.html").write_text(_idx, encoding="utf8")
for f in ["index.html", "app.js", "styles.css", "manifest.webmanifest"]:
    rebrand(pub / f)

man = (pub / "manifest.webmanifest").read_text(encoding="utf8")
man = man.replace('"APP AM"', '"APP PP"').replace("Aplicación de gestión del despacho Molinero", "Aplicación de gestión de ProPymes Asesores")
man = re.sub(r"\?v=\d+", "?v=pp7", man)
(pub / "manifest.webmanifest").write_text(man, encoding="utf8")

pkg = (PP / "package.json").read_text(encoding="utf8")
(PP / "package.json").write_text(re.sub(r'"name":\s*"[^"]*"', '"name": "app-pp"', pkg, count=1), encoding="utf8")
readme = (PP / "README.md").read_text(encoding="utf8")
(PP / "README.md").write_text(readme.replace("# APP AM", "# APP PP · ProPymes Asesores\n\nCopia de APP.AM con la imagen corporativa de ProPymes. Para actualizarla con los últimos cambios de APP.AM: `python3 tools/brand-pp.py ../APP.AM .`", 1), encoding="utf8")

# ---------------------------------------------------------------- 4. logos e iconos
# Logos oficiales (PNG transparentes) en brand/oficial; de ellos salen todas las variantes.
from PIL import Image

OFI = BRAND / "oficial"
NAVY, TAN, WHITE = (7, 33, 61), (210, 180, 140), (255, 255, 255)

def load(name):
    im = Image.open(OFI / name).convert("RGBA")
    return im.crop(im.getbbox())

def recolor(im, mapping):
    """Cambia cada color de marca (el más cercano) por otro, conservando la transparencia."""
    out = im.copy(); px = out.load()
    refs = {"navy": NAVY, "tan": TAN, "white": WHITE}
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            key = min(refs, key=lambda k: sum((c - d) ** 2 for c, d in zip((r, g, b), refs[k])))
            if key in mapping:
                px[x, y] = (*mapping[key], a)
    return out

def first_band(im, axis):
    """Recorta la primera franja con contenido (el isotipo) en horizontal (axis=0) o vertical (axis=1)."""
    alpha = im.getchannel("A"); w, h = im.size
    n = w if axis == 0 else h
    filled = [any(alpha.getpixel((i, j) if axis == 0 else (j, i)) > 40 for j in range(0, h if axis == 0 else w, 2)) for i in range(n)]
    start = filled.index(True); end = start
    while end < n and filled[end]:
        end += 1
    part = im.crop((start, 0, end, h) if axis == 0 else (0, start, w, end))
    return part.crop(part.getbbox())

def fit(im, width):
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)

vertical_light = load("vertical-arena-blanco.png")                     # fondos marino
vertical_dark = recolor(vertical_light, {"white": NAVY})              # fondos claros
horizontal_sand = recolor(load("horizontal-arena-marino.png"), {"tan": WHITE})  # barra arena: P dorada en blanco
vertical_sand = recolor(vertical_light, {"tan": WHITE, "white": NAVY})  # cabeceras arena del área de cliente
mark_light = first_band(vertical_light, 1)
mark_sand = first_band(horizontal_sand, 0)

fit(vertical_light, 1200).save(pub / "logo-pp-light.png", optimize=True)
fit(vertical_dark, 1200).save(pub / "logo-pp.png", optimize=True)
fit(horizontal_sand, 1200).save(pub / "logo-pp-sand.png", optimize=True)
fit(vertical_sand, 1200).save(pub / "logo-pp-sand-v.png", optimize=True)
fit(mark_light, 400).save(pub / "mark-pp-light.png", optimize=True)
fit(mark_sand, 400).save(pub / "mark-pp-sand.png", optimize=True)
fit(vertical_light, 1116).save(pub / "splash-logo.png", optimize=True)   # splash / cabeceras oscuras

def icon(size, pad):
    bg = Image.new("RGBA", (size, size), (*NAVY, 255))
    box = int(size * (1 - 2 * pad))
    mark = mark_light.copy(); mark.thumbnail((box, box), Image.LANCZOS)
    bg.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    return bg

icon(512, .16).save(pub / "app-icon.png", optimize=True)
icon(192, .16).save(pub / "app-icon-192.png", optimize=True)
icon(512, .24).save(pub / "app-icon-maskable.png", optimize=True)
icon(180, .16).convert("RGB").save(pub / "apple-touch-icon.png", optimize=True)
icon(64, .12).save(pub / "favicon.png", optimize=True)

shutil.copy2(BRAND / "pp-theme.css", pub / "pp-theme.css")

# ---------------------------------------------------------------- 5. demostración para clientes
# Usuario "Cliente" (contraseña en PP_DEMO_PASSWORD, por defecto "prueba"): solo vista de cliente
# con documentos ficticios. Ver brand/demo/.
DEMO = BRAND / "demo"
shutil.copy2(DEMO / "pp-demo-server.js", PP / "pp-demo-server.js")
shutil.copy2(DEMO / "pp-demo.js", pub / "pp-demo.js")
shutil.copy2(BRAND / "pp-cliente.js", pub / "pp-cliente.js")
shutil.copy2(BRAND / "pp-gestion.js", pub / "pp-gestion.js")
# Logo de Molinero para los clientes de Asesoría Molinero (se toma de APP.AM tal cual)
(pub / "molinero").mkdir(exist_ok=True)
shutil.copy2(AM / "public" / "splash-logo.png", pub / "molinero" / "logo-claro.png")
shutil.copy2(BRAND / "sw.js", pub / "sw.js")

# La app instalada aparece en "Compartir" del móvil para recibir PDF (Android; iPhone no lo permite a las web-apps)
import json
manifest = json.loads((pub / "manifest.webmanifest").read_text(encoding="utf8"))
manifest["share_target"] = {"action": "/compartir", "method": "POST", "enctype": "multipart/form-data",
                            "params": {"title": "title", "text": "text", "files": [{"name": "documentos", "accept": ["application/pdf", ".pdf"]}]}}
(pub / "manifest.webmanifest").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf8")
shutil.copytree(DEMO / "pdf", pub / "demo", dirs_exist_ok=True)
shutil.copy2(DEMO / "documentos.json", pub / "demo" / "documentos.json")

html = (pub / "index.html").read_text(encoding="utf8")
html, n = re.subn(r'(<script src="/app\.js[^"]*"></script>)', r'\1<script src="/pp-cliente.js?v=pp22"></script><script src="/pp-gestion.js?v=pp20"></script><script src="/pp-demo.js?v=pp15"></script>', html, count=1)
assert n == 1, "No se encontró app.js en index.html"
(pub / "index.html").write_text(html, encoding="utf8")

srv = open(PP / "server.js", encoding="utf8", newline="").read()
eol = "\r\n" if "\r\n" in srv else "\n"
hook = 'const requestPath = req.url.split("?")[0];'
assert hook in srv, "server.js ha cambiado: revisar el enganche de la demo"
srv = srv.replace(hook, hook + eol + '  if (ppDemo(req, res, requestPath)) return;', 1)
srv = srv.replace('const http = require("http");', 'const http = require("http");' + eol + 'const ppDemo = require("./pp-demo-server");', 1)
assert "ppDemo = require" in srv
open(PP / "server.js", "w", encoding="utf8", newline="").write(srv)

print("APP_PP generado desde", AM)
