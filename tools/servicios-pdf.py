#!/usr/bin/env python3
"""Genera las presentaciones PDF de servicios con la imagen de ProPymes.

Parte de los PDF de Asesoría Molinero que van incrustados en APP.AM (public/app.js,
`clientServicePdfFiles`) y los reescribe sin tocar la maquetación: cambia la paleta
azul por la de ProPymes (marino, arena y crema), los textos de marca y el logo.

    pip install pymupdf --break-system-packages
    python3 tools/servicios-pdf.py <APP.AM> brand/servicios/pdf
"""
import base64, colorsys, json, re, sys
from pathlib import Path
import pymupdf

AM, OUT = Path(sys.argv[1]), Path(sys.argv[2])
BRAND = Path(__file__).resolve().parent.parent / "brand"
MARK = BRAND / "servicios" / "marca-pdf.png"
OUT.mkdir(parents=True, exist_ok=True)

source = (AM / "public" / "app.js").read_text(encoding="utf8")
match = re.search(r"^const clientServicePdfFiles=(\{.*\});$", source, re.M)
assert match, "No se encontraron los PDF de servicios en app.js"
files = json.loads(match.group(1))

hexrgb = lambda h: tuple(int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
mix = lambda a, b, t: tuple(x + (y - x) * t for x, y in zip(a, b))
NAVY, NAVY_LIGHT, ACCENT, SAND = hexrgb("#07213d"), hexrgb("#1b4470"), hexrgb("#a8875a"), hexrgb("#c9a46e")


def remap(rgb):
    if all(c > .995 for c in rgb):
        return rgb
    h, l, s = colorsys.rgb_to_hls(*rgb)
    if 20 / 360 < h < 60 / 360 and s > .3:           # dorado → arena
        return SAND
    if s > .5 and .3 < l < .65:                       # azul de acento → arena oscuro
        return ACCENT
    if l < .3:                                        # marinos (fondos y títulos)
        return mix(NAVY, NAVY_LIGHT, max(0, (l - .12) / .18))
    if l > .7:                                        # azules claros → cremas
        return colorsys.hls_to_rgb(34 / 360, l, min(s, .5) * .8)
    return colorsys.hls_to_rgb(30 / 360, l, .12)      # grises azulados → grises cálidos


def color_sub(m):
    rgb = remap(tuple(float(v) for v in m.group(1, 2, 3)))
    return " ".join(f"{v:.6f}".rstrip("0").rstrip(".") or "0" for v in rgb) + " " + m.group(4)


TEXTS = [(r"(ASESOR\315A MOLINERO)", r"(PROPYMES ASESORES)"),
         (r"(ASESOR\315A FISCAL \267 AUDITOR\315A DE CUENTAS)", r"(ASESORES LEGALES \267 PYMES Y AUT\323NOMOS)")]


def footer_sub(m):
    # dominio alineado a la derecha: se desplaza lo que cambie de ancho
    size = float(m.group(1))
    x = float(m.group(2)) + pymupdf.get_text_length("asesoriamolinero.es", "helv", size) - pymupdf.get_text_length("propymesasesores.es", "helv", size)
    return f"{m.group(0)[:m.start(2) - m.start(0)]}{x:.4f}{m.group(0)[m.end(2) - m.start(0):]}".replace("(asesoriamolinero.es)", "(propymesasesores.es)")


for name, encoded in files.items():
    doc = pymupdf.open(stream=base64.b64decode(encoded), filetype="pdf")
    for page in doc:
        images = {img[0] for img in page.get_images(full=True)}
        for xref in page.get_contents():
            s = doc.xref_stream(xref).decode("latin1")
            s = re.sub(r"(?<![\w.])([\d.]+) ([\d.]+) ([\d.]+) (rg|RG)\b", color_sub, s)
            for old, new in TEXTS:
                s = s.replace(old, new)
            s = re.sub(r"/F1 ([\d.]+) Tf[^\n]*\nBT 1 0 0 1 ([\d.]+) [\d.]+ Tm \(asesoriamolinero\.es\)", footer_sub, s)
            assert "olinero" not in s.lower(), f"{name}: queda texto de Molinero"
            doc.update_stream(xref, s.encode("latin1"))
        for xref in images:
            page.replace_image(xref, filename=str(MARK))
    title = doc.metadata.get("title", "").replace("Asesoría Molinero", "ProPymes Asesores")
    doc.set_metadata({**doc.metadata, "title": title, "author": "ProPymes Asesores", "creator": "ProPymes Asesores"})
    doc.save(OUT / name, garbage=4, deflate=True)
    print(name)
